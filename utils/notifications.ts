import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useWorkoutStore } from '@/store/useWorkoutStore';

const USER_NOTIFICATION_CATEGORIES = ['morning', 'water', 'workout'];

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: 'Water Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#60A5FA',
    });
  }

  await Notifications.setNotificationCategoryAsync('morning', [
    {
      identifier: 'ACCEPT_MORNING',
      buttonTitle: 'Accept (500ml)',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DECLINE',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('water', [
    {
      identifier: 'ACCEPT',
      buttonTitle: 'Drink 250ml',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SNOOZE_15',
      buttonTitle: 'Snooze 15m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE_30',
      buttonTitle: 'Snooze 30m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE_60',
      buttonTitle: 'Snooze 1h',
      options: { opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('workout', [
    {
      identifier: 'DONE_WORKOUT',
      buttonTitle: 'Started',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DECLINE',
      buttonTitle: 'Skip',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);
}

export async function scheduleMorningNotifications() {
  // Cancel existing morning notifications first
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allNotifications) {
    if (notification.content.categoryIdentifier === 'morning') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 3; dayOffset += 1) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);

    const morningTime = new Date(targetDate);
    morningTime.setHours(9, 0, 0, 0);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Good Morning!',
        body: 'Start your day with a fresh 500ml glass to wake up your body!',
        categoryIdentifier: 'morning',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morningTime },
    });
  }
}

export async function scheduleWorkoutReminders() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  await cancelUserNotifications(['workout']);

  const schedule = useWorkoutStore.getState().schedule;
  const days = Object.keys(schedule);

  for (const dayString of days) {
    const day = Number.parseInt(dayString, 10) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const daySetting = schedule[day];

    if (!daySetting || daySetting.isRest) {
      continue;
    }

    const triggerDate = new Date();
    triggerDate.setHours(daySetting.hour, daySetting.minute, 0, 0);
    triggerDate.setMinutes(triggerDate.getMinutes() - 15);

    const originalTime = new Date();
    originalTime.setHours(daySetting.hour, daySetting.minute, 0, 0);

    let targetWeekday = day;
    if (triggerDate.getDate() < originalTime.getDate()) {
      targetWeekday = day - 1 < 1 ? 7 : ((day - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    } else if (triggerDate.getDate() > originalTime.getDate()) {
      targetWeekday = day + 1 > 7 ? 1 : ((day + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Workout Time Approaching!',
        body: 'Your scheduled workout starts in precisely 15 minutes. Get ready!',
        categoryIdentifier: 'workout',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: targetWeekday,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
      },
    });
  }
}

export async function cancelUserNotifications(
  categories: string[] = USER_NOTIFICATION_CATEGORIES
) {
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of allNotifications) {
    if (categories.includes(notification.content.categoryIdentifier ?? '')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
