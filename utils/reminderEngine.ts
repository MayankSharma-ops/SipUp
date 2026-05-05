import * as Notifications from 'expo-notifications';

import { useReminderStore } from '@/store/useReminderStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clamp a timestamp so it never falls inside quiet hours.
 * If it does, push it to quietHoursEnd the same or next morning.
 */
function clampToActiveHours(
  timestamp: number,
  quietStart: number,
  quietEnd: number
): number {
  const date = new Date(timestamp);
  const hour = date.getHours();

  // Quiet hours wrap midnight: e.g. 22:00 → 08:00
  const inQuiet =
    quietStart > quietEnd
      ? hour >= quietStart || hour < quietEnd
      : hour >= quietStart && hour < quietEnd;

  if (!inQuiet) {
    return timestamp;
  }

  // Push to quietHoursEnd today or tomorrow
  const clamped = new Date(date);
  clamped.setHours(quietEnd, 0, 0, 0);

  // If clamped time is still in the past or still in quiet hours, push to tomorrow
  if (clamped.getTime() <= Date.now()) {
    clamped.setDate(clamped.getDate() + 1);
  }

  return clamped.getTime();
}

/**
 * Cancel only the tracked water notification (by stored ID).
 * Falls back to cancelling all water-category notifications as safety net.
 */
async function cancelCurrentWaterNotification(): Promise<void> {
  const { currentNotificationId } = useReminderStore.getState();

  if (currentNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(currentNotificationId);
    } catch {
      // Notification may have already fired — that's fine
    }
  }

  // Safety net: sweep any lingering water notifications
  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of allScheduled) {
    if (n.content.categoryIdentifier === 'water') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  useReminderStore.getState().setNextReminder(null, null);
}

/**
 * Schedule a single DATE-based water notification and persist its ID.
 */
async function scheduleNotificationAt(time: number): Promise<void> {
  const store = useReminderStore.getState();
  const { quietHoursStart, quietHoursEnd } = store;

  const clampedTime = clampToActiveHours(time, quietHoursStart, quietHoursEnd);

  // Don't schedule in the past
  if (clampedTime <= Date.now()) {
    // Schedule 5 seconds from now as immediate fallback
    const fallback = Date.now() + 5_000;
    const fallbackClamped = clampToActiveHours(fallback, quietHoursStart, quietHoursEnd);
    return scheduleNotificationAtFinal(fallbackClamped);
  }

  return scheduleNotificationAtFinal(clampedTime);
}

async function scheduleNotificationAtFinal(time: number): Promise<void> {
  const remainingWater = getRemainingWater();
  const bodyText =
    remainingWater > 0
      ? `You still have ${remainingWater}ml to go! Time for a sip.`
      : "Great job hitting your goal! Stay hydrated.";

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hydration Check!',
      body: bodyText,
      categoryIdentifier: 'water',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(time),
    },
  });

  useReminderStore.getState().setNextReminder(time, notificationId);
}

/**
 * Quick helper to read remaining water from the water store.
 */
function getRemainingWater(): number {
  // Dynamic import to avoid circular dependency issues at module level
  const { useWaterStore } = require('@/store/useWaterStore');
  const { intake, goal } = useWaterStore.getState();
  return Math.max(goal - intake, 0);
}

// ---------------------------------------------------------------------------
// Public API — the Reminder Engine
// ---------------------------------------------------------------------------

/**
 * Called whenever the user drinks water (manual log or notification accept).
 *
 * Rules applied:
 * - Tolerance window: if drink is within ±tolerance of the scheduled reminder,
 *   use scheduledTime + interval instead of drinkTime + interval.
 * - Minimum gap protection: never schedule sooner than now + minGap.
 * - Quiet hours clamping on both input and output.
 */
export async function onDrink(drinkTimestamp: number): Promise<void> {
  const store = useReminderStore.getState();

  if (!store.remindersEnabled) {
    return;
  }

  const {
    intervalMinutes,
    toleranceMinutes,
    minGapMinutes,
    nextReminderTime,
    quietHoursStart,
    quietHoursEnd,
  } = store;

  const intervalMs = intervalMinutes * 60_000;
  const toleranceMs = toleranceMinutes * 60_000;
  const minGapMs = minGapMinutes * 60_000;

  // Clamp input: if drink happens during quiet hours, treat as happening at quietHoursEnd
  const effectiveNow = clampToActiveHours(drinkTimestamp, quietHoursStart, quietHoursEnd);

  await cancelCurrentWaterNotification();

  let computedNext: number;

  // Tolerance check: only if drink is near the scheduled reminder
  if (
    nextReminderTime !== null &&
    drinkTimestamp >= nextReminderTime - toleranceMs &&
    drinkTimestamp <= nextReminderTime + toleranceMs
  ) {
    // Treat as "on time" — anchor from the scheduled reminder time
    computedNext = nextReminderTime + intervalMs;
  } else {
    // Normal case — anchor from effective drink time
    computedNext = effectiveNow + intervalMs;
  }

  // Minimum gap protection
  const now = Date.now();
  computedNext = Math.max(computedNext, now + minGapMs);

  await scheduleNotificationAt(computedNext);
}

/**
 * Called when user taps a snooze button on the notification.
 * Does NOT reset the habit cycle — just delays the reminder.
 */
export async function onSnooze(snoozeMinutes: number): Promise<void> {
  const store = useReminderStore.getState();

  if (!store.remindersEnabled) {
    return;
  }

  const { minGapMinutes } = store;
  const minGapMs = minGapMinutes * 60_000;

  await cancelCurrentWaterNotification();

  const now = Date.now();
  const snoozeMs = snoozeMinutes * 60_000;

  // Enforce minimum gap
  const computedNext = Math.max(now + snoozeMs, now + minGapMs);

  await scheduleNotificationAt(computedNext);
}

/**
 * Called when user taps "Decline" on the notification.
 * Uses the configured default snooze duration (not a full interval).
 */
export async function onReject(): Promise<void> {
  const { defaultSnoozeMinutes } = useReminderStore.getState();
  await onSnooze(defaultSnoozeMinutes);
}

/**
 * Called on app start to reconcile persisted state with reality.
 *
 * - If nextReminderTime is in the future → ensure notification exists
 * - If missed by < 1 interval → trigger immediately
 * - If missed by a long time or null → schedule now + interval (fresh start)
 */
export async function onAppStart(): Promise<void> {
  const store = useReminderStore.getState();

  if (!store.remindersEnabled) {
    return;
  }

  const { nextReminderTime, intervalMinutes } = store;
  const intervalMs = intervalMinutes * 60_000;
  const now = Date.now();

  if (nextReminderTime === null) {
    // First-time setup: schedule from now
    await cancelCurrentWaterNotification();
    await scheduleNotificationAt(now + intervalMs);
    return;
  }

  if (nextReminderTime > now) {
    // Future — ensure the notification actually exists (may have been cleared by OS)
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const exists = allScheduled.some(
      (n) => n.content.categoryIdentifier === 'water'
    );

    if (!exists) {
      await scheduleNotificationAt(nextReminderTime);
    }
    return;
  }

  // nextReminderTime is in the past
  const missedBy = now - nextReminderTime;

  if (missedBy < intervalMs) {
    // Missed recently — trigger now (schedule 5s from now to show notification)
    await cancelCurrentWaterNotification();
    await scheduleNotificationAt(now + 5_000);
  } else {
    // Missed by a long time — clean reset
    await cancelCurrentWaterNotification();
    await scheduleNotificationAt(now + intervalMs);
  }
}

/**
 * Utility: completely disable reminders and cancel pending notification.
 */
export async function disableReminders(): Promise<void> {
  await cancelCurrentWaterNotification();
  useReminderStore.getState().updateSettings({ remindersEnabled: false });
}

/**
 * Utility: re-enable reminders and schedule from now.
 */
export async function enableReminders(): Promise<void> {
  const store = useReminderStore.getState();
  store.updateSettings({ remindersEnabled: true });

  const intervalMs = store.intervalMinutes * 60_000;
  await scheduleNotificationAt(Date.now() + intervalMs);
}
