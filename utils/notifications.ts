import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';

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
      buttonTitle: 'Accept (500ml) ☀️',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DECLINE',
      buttonTitle: 'Dismiss ❌',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);

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

  await Notifications.setNotificationCategoryAsync('workout', [
    {
      identifier: 'DONE_WORKOUT',
      buttonTitle: 'Started! 💪',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DECLINE',
      buttonTitle: 'Skip ❌',
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

  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of allNotifications) {
    if (n.content.categoryIdentifier === 'water' || n.content.categoryIdentifier === 'morning') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const remainingWater = goal - intake;

  const now = new Date();
  
  // 1. Sliding Window for TODAY (Skip if User Just Drank)
  // Because this function re-runs entirely every time the user manually logs water,
  // we push all pending reminders back, creating a solid "snooze" if they just drank.
  if (remainingWater > 0) {
    for (let i = 1; i <= 3; i++) { // Project 3 upcoming reminders
      const triggerTime = new Date(now.getTime() + i * 2 * 60 * 60 * 1000); // 2h, 4h, 6h from EXACTLY now
      const hour = triggerTime.getHours();
      
      // Only fire today, and only between 9 AM and 10 PM
      if (triggerTime.getDate() === now.getDate() && hour >= 9 && hour < 22) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Hydration Check! 💧",
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

  // 2. The Lifeline Matrix (Next 3 Days)
  // Ensures that if the app is killed and the user goes dormant, they still get poked tomorrow.
  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);

    // Morning check-in (9 AM)
    const morningTime = new Date(targetDate);
    morningTime.setHours(9, 0, 0, 0);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Good Morning! ☀️",
        body: "Start your day with a fresh 500ml glass to wake up your body!",
        categoryIdentifier: 'morning', 
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morningTime },
    });

    // Afternoon & Evening fallbacks (2 PM, 7 PM)
    const fallbackTimes = [14, 19];
    for (const hour of fallbackTimes) {
      const triggerTime = new Date(targetDate);
      triggerTime.setHours(hour, 0, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Keep it up! 💧",
          body: `Don't forget to pace your hydration today!`,
          categoryIdentifier: 'water',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerTime },
      });
    }
  }
}

export async function scheduleWorkoutReminders() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of allNotifications) {
    if (n.content.categoryIdentifier === 'workout') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const schedule = useWorkoutStore.getState().schedule;
  const days = Object.keys(schedule);

  for (const dayStr of days) {
    const day = parseInt(dayStr, 10) as 1|2|3|4|5|6|7;
    const daySetting = schedule[day];
    if (!daySetting || daySetting.isRest) continue;

    // Calculate 15 mins prior strictly natively
    const d = new Date();
    d.setHours(daySetting.hour, daySetting.minute, 0, 0);
    d.setMinutes(d.getMinutes() - 15);
    
    // Evaluate if subtraction warped target over a day boundary natively
    const originalTime = new Date();
    originalTime.setHours(daySetting.hour, daySetting.minute, 0, 0);
    
    let targetWeekday = day;
    if (d.getDate() < originalTime.getDate()) {
       targetWeekday = (day - 1) < 1 ? 7 : (day - 1) as any;
    } else if (d.getDate() > originalTime.getDate()) {
       targetWeekday = (day + 1) > 7 ? 1 : (day + 1) as any;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Workout Time Approaching! 🏋️‍♂️",
        body: "Your scheduled workout starts in precisely 15 minutes. Get ready!",
        categoryIdentifier: 'workout',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: targetWeekday,
        hour: d.getHours(),
        minute: d.getMinutes(),
      },
    });
  }
}
