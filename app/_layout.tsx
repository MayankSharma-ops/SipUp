import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef } from 'react';
import 'react-native-reanimated';

import { EmailAuthGate } from '@/components/email-auth-gate';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useWaterStore } from '@/store/useWaterStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  ApiError,
  fetchCurrentUser,
  saveRemoteProfile,
} from '@/utils/api';
import {
  cancelUserNotifications,
  scheduleMorningNotifications,
  scheduleWorkoutReminders,
  setupNotificationChannel,
} from '@/utils/notifications';
import {
  onAppStart,
  onDrink,
  onReject,
  onSnooze,
} from '@/utils/reminderEngine';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const intake = useWaterStore((state) => state.intake);
  const goal = useWaterStore((state) => state.goal);
  const lastDrinkTimestamp = useWaterStore((state) => state.lastDrinkTimestamp);
  const hydrateWater = useWaterStore((state) => state.hydrateWater);
  const resetWaterProfile = useWaterStore((state) => state.resetWaterProfile);
  const hydrateHistory = useHistoryStore((state) => state.hydrateHistory);
  const resetHistory = useHistoryStore((state) => state.resetHistory);
  const hydrateWorkout = useWorkoutStore((state) => state.hydrateWorkout);
  const resetWorkout = useWorkoutStore((state) => state.resetWorkout);
  const hydrated = useProfileStore((state) => state.hydrated);
  const currentUserEmail = useProfileStore((state) => state.currentUserEmail);
  const currentSessionToken = useProfileStore((state) => state.currentSessionToken);
  const profiles = useProfileStore((state) => state.profiles);
  const logout = useProfileStore((state) => state.logout);
  const mergeRemoteProfile = useProfileStore((state) => state.mergeRemoteProfile);
  const saveCurrentUserData = useProfileStore((state) => state.saveCurrentUserData);

  const waterSnapshot = useWaterStore((state) => ({
    companionState: state.companionState,
    drinkLogs: state.drinkLogs,
    goal: state.goal,
    intake: state.intake,
    lastAppOpenDate: state.lastAppOpenDate,
    lastDrinkTimestamp: state.lastDrinkTimestamp,
    lastUpdatedDate: state.lastUpdatedDate,
    lifetimeXp: state.lifetimeXp,
    wakeUpTime: state.wakeUpTime,
  }));
  const historySnapshot = useHistoryStore((state) => ({
    history: state.history,
    streak: state.streak,
  }));
  const workoutSnapshot = useWorkoutStore((state) => ({
    schedule: state.schedule,
  }));

  const currentProfile = currentUserEmail ? profiles[currentUserEmail] : null;
  const sessionKey = currentUserEmail && currentSessionToken
    ? `${currentUserEmail}:${currentSessionToken}`
    : null;

  const appliedSessionRef = useRef<string | null>(null);
  const remoteFetchInFlightRef = useRef<string | null>(null);
  const remoteFetchedSessionRef = useRef<string | null>(null);
  const awaitingHydrationRef = useRef<{ sessionKey: string; signature: string } | null>(null);
  const lastSyncedRef = useRef<string | null>(null);

  const syncPayload = useMemo(
    () => ({
      history: historySnapshot,
      water: waterSnapshot,
      workout: workoutSnapshot,
    }),
    [historySnapshot, waterSnapshot, workoutSnapshot]
  );
  const syncSignature = useMemo(() => JSON.stringify(syncPayload), [syncPayload]);

  // -----------------------------------------------------------------------
  // App start: setup channels, workout reminders, morning greeting, and
  // reconcile the dynamic reminder engine.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated || !sessionKey) {
      return;
    }

    void (async () => {
      useWaterStore.getState().checkNewDay();
      await setupNotificationChannel();
      await scheduleWorkoutReminders();
      await scheduleMorningNotifications();

      // Reconcile the smart reminder engine on app start
      await onAppStart();

      const todayString = format(new Date(), 'yyyy-MM-dd');
      const waterState = useWaterStore.getState();
      if (waterState.lastAppOpenDate !== todayString) {
        waterState.setLastAppOpenDate(todayString);
        setTimeout(() => {
          void Notifications.scheduleNotificationAsync({
            content: {
              title: 'Good Morning!',
              body: "Let's start the day hydrated. Would you like to log your first 500ml?",
              categoryIdentifier: 'morning',
            },
            trigger: null,
          });
        }, 500);
      }
    })();

    // -----------------------------------------------------------------------
    // Notification response listener — handle all action buttons
    // -----------------------------------------------------------------------
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;

      if (action === 'ACCEPT') {
        useWaterStore.getState().addWater(250);
        // addWater sets lastDrinkTimestamp, the effect below handles onDrink()
      } else if (action === 'ACCEPT_MORNING') {
        useWaterStore.getState().addWater(500);
        // Same — triggers the lastDrinkTimestamp effect
      } else if (action === 'SNOOZE_15') {
        void onSnooze(15);
      } else if (action === 'SNOOZE_30') {
        void onSnooze(30);
      } else if (action === 'SNOOZE_60') {
        void onSnooze(60);
      } else if (action === 'DECLINE') {
        void onReject();
      } else if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // User tapped the notification body itself (opened the app)
        // Treat as "I'm aware" — schedule default snooze so they don't miss it
        // but don't spam. They can manually log from the app.
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [hydrated, sessionKey]);

  // -----------------------------------------------------------------------
  // Dynamic reminder: whenever the user drinks (lastDrinkTimestamp changes),
  // reset the reminder timer via the engine.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated || !sessionKey || lastDrinkTimestamp === null) {
      return;
    }

    void onDrink(lastDrinkTimestamp);
  }, [hydrated, lastDrinkTimestamp, sessionKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (sessionKey) {
      return;
    }

    if (appliedSessionRef.current) {
      resetHistory();
      resetWaterProfile();
      resetWorkout();
      void cancelUserNotifications();
    }

    appliedSessionRef.current = null;
    remoteFetchInFlightRef.current = null;
    remoteFetchedSessionRef.current = null;
    awaitingHydrationRef.current = null;
    lastSyncedRef.current = null;
  }, [hydrated, resetHistory, resetWaterProfile, resetWorkout, sessionKey]);

  useEffect(() => {
    if (!hydrated || !sessionKey || !currentProfile) {
      return;
    }

    if (appliedSessionRef.current === sessionKey) {
      return;
    }

    hydrateHistory(currentProfile.history);
    hydrateWater(currentProfile.water);
    hydrateWorkout(currentProfile.workout);

    const cachedPayload = {
      history: currentProfile.history,
      water: currentProfile.water,
      workout: currentProfile.workout,
    };
    const cachedSignature = JSON.stringify(cachedPayload);

    awaitingHydrationRef.current = { sessionKey, signature: cachedSignature };
    lastSyncedRef.current = `${sessionKey}:${cachedSignature}`;
    appliedSessionRef.current = sessionKey;
  }, [currentProfile, hydrateHistory, hydrateWater, hydrateWorkout, hydrated, sessionKey]);

  useEffect(() => {
    if (!hydrated || !sessionKey || !currentSessionToken) {
      return;
    }

    if (
      remoteFetchedSessionRef.current === sessionKey ||
      remoteFetchInFlightRef.current === sessionKey
    ) {
      return;
    }

    remoteFetchInFlightRef.current = sessionKey;

    void (async () => {
      try {
        const response = await fetchCurrentUser(currentSessionToken);
        mergeRemoteProfile(response);

        hydrateHistory(response.profile.history);
        hydrateWater(response.profile.water);
        hydrateWorkout(response.profile.workout);

        const remotePayload = {
          history: response.profile.history,
          water: response.profile.water,
          workout: response.profile.workout,
        };
        const remoteSignature = JSON.stringify(remotePayload);

        awaitingHydrationRef.current = { sessionKey, signature: remoteSignature };
        lastSyncedRef.current = `${sessionKey}:${remoteSignature}`;
        appliedSessionRef.current = sessionKey;
        remoteFetchedSessionRef.current = sessionKey;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        console.warn('[profile] Unable to fetch remote profile. Using cached/local data.', error);
        appliedSessionRef.current = sessionKey;
        remoteFetchedSessionRef.current = sessionKey;
      } finally {
        if (remoteFetchInFlightRef.current === sessionKey) {
          remoteFetchInFlightRef.current = null;
        }
      }
    })();
  }, [
    currentSessionToken,
    hydrateHistory,
    hydrateWater,
    hydrateWorkout,
    hydrated,
    logout,
    mergeRemoteProfile,
    sessionKey,
  ]);

  useEffect(() => {
    if (!hydrated || !sessionKey || !currentSessionToken) {
      return;
    }

    if (appliedSessionRef.current !== sessionKey || remoteFetchedSessionRef.current !== sessionKey) {
      return;
    }

    const awaitingHydration = awaitingHydrationRef.current;
    if (awaitingHydration?.sessionKey === sessionKey) {
      if (syncSignature !== awaitingHydration.signature) {
        return;
      }

      awaitingHydrationRef.current = null;
    }

    const nextSyncKey = `${sessionKey}:${syncSignature}`;
    if (lastSyncedRef.current === nextSyncKey) {
      return;
    }

    void (async () => {
      try {
        const response = await saveRemoteProfile(currentSessionToken, syncPayload);
        mergeRemoteProfile(response);
        saveCurrentUserData(syncPayload);
        lastSyncedRef.current = nextSyncKey;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        console.warn('[profile] Unable to sync local profile to Neon.', error);
      }
    })();
  }, [
    currentSessionToken,
    hydrated,
    logout,
    mergeRemoteProfile,
    saveCurrentUserData,
    sessionKey,
    syncPayload,
    syncSignature,
  ]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <EmailAuthGate />
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
