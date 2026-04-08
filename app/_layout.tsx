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
  cancelUserNotifications,
  scheduleOneOffReminder,
  scheduleSmartNotifications,
  scheduleWorkoutReminders,
  setupNotificationChannel,
} from '@/utils/notifications';

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

  const loadedUserRef = useRef<string | null | undefined>(undefined);
  const awaitingHydrationRef = useRef<{ email: string; signature: string } | null>(null);
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

  useEffect(() => {
    if (!hydrated || !currentUserEmail) {
      return;
    }

    void (async () => {
      useWaterStore.getState().checkNewDay();
      await setupNotificationChannel();
      await scheduleWorkoutReminders();

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

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;

      if (action === 'ACCEPT') {
        useWaterStore.getState().addWater(250);
      } else if (action === 'ACCEPT_MORNING') {
        useWaterStore.getState().addWater(500);
      } else if (action === 'REMIND') {
        void scheduleOneOffReminder(10);
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [currentUserEmail, hydrated]);

  useEffect(() => {
    if (!hydrated || !currentUserEmail) {
      return;
    }

    void scheduleSmartNotifications(intake, goal, lastDrinkTimestamp);
  }, [currentUserEmail, goal, hydrated, intake, lastDrinkTimestamp]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!currentUserEmail) {
      if (loadedUserRef.current) {
        resetHistory();
        resetWaterProfile();
        resetWorkout();
        void cancelUserNotifications();
      }

      loadedUserRef.current = null;
      awaitingHydrationRef.current = null;
      lastSyncedRef.current = null;
      return;
    }

    if (loadedUserRef.current === currentUserEmail) {
      return;
    }

    const profile = useProfileStore.getState().profiles[currentUserEmail];
    if (!profile) {
      return;
    }

    hydrateHistory(profile.history);
    hydrateWater(profile.water);
    hydrateWorkout(profile.workout);

    const profilePayload = {
      history: profile.history,
      water: profile.water,
      workout: profile.workout,
    };
    const profileSignature = JSON.stringify(profilePayload);

    loadedUserRef.current = currentUserEmail;
    awaitingHydrationRef.current = {
      email: currentUserEmail,
      signature: profileSignature,
    };
    lastSyncedRef.current = `${currentUserEmail}:${profileSignature}`;
  }, [
    currentUserEmail,
    hydrateHistory,
    hydrateWater,
    hydrateWorkout,
    hydrated,
    resetHistory,
    resetWaterProfile,
    resetWorkout,
  ]);

  useEffect(() => {
    if (!hydrated || !currentUserEmail || loadedUserRef.current !== currentUserEmail) {
      return;
    }

    const awaitingHydration = awaitingHydrationRef.current;
    if (awaitingHydration?.email === currentUserEmail) {
      if (syncSignature !== awaitingHydration.signature) {
        return;
      }

      awaitingHydrationRef.current = null;
    }

    const nextSyncKey = `${currentUserEmail}:${syncSignature}`;
    if (lastSyncedRef.current === nextSyncKey) {
      return;
    }

    saveCurrentUserData(syncPayload);
    lastSyncedRef.current = nextSyncKey;
  }, [currentUserEmail, hydrated, saveCurrentUserData, syncPayload, syncSignature]);

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
