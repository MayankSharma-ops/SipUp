import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: 'Water Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#60A5FA',
    });
  }

  await Notifications.setNotificationCategoryAsync('water', [
    {
      identifier: 'ACCEPT',
      buttonTitle: 'Accept (250ml) ✅',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'REMIND',
      buttonTitle: 'Remind me in 10m ⏱️',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DECLINE',
      buttonTitle: 'Decline ❌',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);
}

export async function scheduleOneOffReminder(minutes: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Hydration Reminder! 💧",
      body: `You asked to be reminded ${minutes} minutes ago. Drink 250ml of water now!`,
      categoryIdentifier: 'water',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
    },
  });
}

export async function scheduleSmartNotifications(intake: number, goal: number, lastDrinkTimestamp: number | null) {
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

  const remainingWater = goal - intake;
  if (remainingWater <= 0) return;

  const portions = Math.ceil(remainingWater / 250);
  if (portions <= 0) return;

  const start = new Date();
  const end = new Date();
  end.setHours(22, 0, 0, 0); // 10 PM

  if (start >= end) return;

  const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const interval = totalMinutes / portions;

  for (let i = 1; i <= portions; i++) {
    const triggerTime = new Date(start.getTime() + i * interval * 60000);
    
    // Skip if recently drank and this is the next immediate notification
    if (i === 1 && lastDrinkTimestamp) {
      const minsSinceDrink = (start.getTime() - lastDrinkTimestamp) / (1000 * 60);
      if (minsSinceDrink < 30) {
        continue;
      }
    }

    if (triggerTime > end) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to hydrate! 💧",
        body: "Drink 250ml of water to keep your streak going.",
        categoryIdentifier: 'water',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });
  }
}
