import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useWaterStore } from '@/store/useWaterStore';

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

  useEffect(() => {
    checkNewDay();
    setupNotifications();
  }, []);

  async function setupNotifications() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('water-reminders', {
        name: 'Water Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#60A5FA',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Smart timing: 9am to 9pm, every 2 hours
    const times = [9, 11, 13, 15, 17, 19, 21];
    
    for (const hour of times) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to hydrate! 💧",
          body: "Drink a glass of water to keep your streak going.",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hour,
          minute: 0,
        },
      });
    }
  }

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
