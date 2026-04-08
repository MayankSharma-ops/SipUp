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
      buttonTitle: 'Accept (250ml)',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'REMIND',
      buttonTitle: 'Remind me in 10m',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DECLINE',
      buttonTitle: 'Decline',
      options: { isDestructive: true, opensAppToForeground: false },
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

export async function scheduleOneOffReminder(minutes: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hydration Reminder!',
      body: `You asked to be reminded ${minutes} minutes ago. Drink 250ml of water now!`,
      categoryIdentifier: 'water',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
    },
  });
}

export async function scheduleSmartNotifications(
  intake: number,
  goal: number,
  lastDrinkTimestamp: number | null
) {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allNotifications) {
    if (
      notification.content.categoryIdentifier === 'water' ||
      notification.content.categoryIdentifier === 'morning'
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  const remainingWater = goal - intake;
  const now = new Date();

  if (remainingWater > 0) {
    for (let index = 1; index <= 3; index += 1) {
      const triggerTime = new Date(now.getTime() + index * 2 * 60 * 60 * 1000);
      const hour = triggerTime.getHours();

      if (triggerTime.getDate() === now.getDate() && hour >= 9 && hour < 22) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hydration Check!',
            body: `You still have ${remainingWater}ml to go! Time for a sip.`,
            categoryIdentifier: 'water',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        });
      }
    }
  }

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

    for (const hour of [14, 19]) {
      const triggerTime = new Date(targetDate);
      triggerTime.setHours(hour, 0, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Keep it up!',
          body: "Don't forget to pace your hydration today!",
          categoryIdentifier: 'water',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
      });
    }
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
