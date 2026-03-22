import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { useWaterStore } from '@/store/useWaterStore';
import { format } from 'date-fns';
import { setupNotificationChannel, scheduleSmartNotifications, scheduleOneOffReminder, scheduleWorkoutReminders } from '@/utils/notifications';

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
  const colorScheme = useColorScheme();
  
  const checkNewDay = useWaterStore((state) => state.checkNewDay);
  const intake = useWaterStore((state) => state.intake);
  const goal = useWaterStore((state) => state.goal);
  const lastDrinkTimestamp = useWaterStore((state) => state.lastDrinkTimestamp);
  const lastAppOpenDate = useWaterStore((state) => state.lastAppOpenDate);
  const setLastAppOpenDate = useWaterStore((state) => state.setLastAppOpenDate);
  const addWater = useWaterStore((state) => state.addWater);

  useEffect(() => {
    checkNewDay();
    setupNotificationChannel();
    
    // Notification Response Listener
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const action = response.actionIdentifier;
      if (action === 'ACCEPT') {
        addWater(250);
      } else if (action === 'ACCEPT_MORNING') {
        addWater(500);
      } else if (action === 'REMIND') {
        scheduleOneOffReminder(10);
      } else if (action === 'DONE_WORKOUT') {
        // UI for tracking workouts can go here later natively
      }
      // DECLINE does nothing
    });

    scheduleWorkoutReminders();

    // Morning check logic
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (lastAppOpenDate !== todayStr) {
      setLastAppOpenDate(todayStr); // Sets wakeUpTime implicitly
      setTimeout(() => {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Good Morning! ☀️",
            body: "Let's start the day hydrated. Would you like to log your first 500ml?",
            categoryIdentifier: 'morning',
          },
          trigger: null,
        });
      }, 500);
    }

    return () => {
      responseListener.remove();
    };
  }, []);

  useEffect(() => {
    scheduleSmartNotifications(intake, goal, lastDrinkTimestamp);
  }, [intake, goal, lastDrinkTimestamp]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
