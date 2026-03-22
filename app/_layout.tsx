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
import { setupNotificationChannel, scheduleSmartNotifications } from '@/utils/notifications';

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
    
    // Morning check logic
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (lastAppOpenDate !== todayStr) {
      setTimeout(() => {
        Alert.alert(
          "Good Morning! ☀️",
          "Let's start the day hydrated. Would you like to log your first 500ml?",
          [
            { text: "Skip", onPress: () => setLastAppOpenDate(todayStr), style: "cancel" },
            { 
              text: "Yes, 500ml", 
              onPress: () => { 
                 setLastAppOpenDate(todayStr); 
                 addWater(500); 
              } 
            }
          ]
        );
      }, 500);
    }
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
