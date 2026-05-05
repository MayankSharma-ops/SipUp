import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createAppStorage } from './storage';

export interface ReminderSnapshot {
  intervalMinutes: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  toleranceMinutes: number;
  defaultSnoozeMinutes: number;
  minGapMinutes: number;
  remindersEnabled: boolean;
  nextReminderTime: number | null;
  currentNotificationId: string | null;
}

export function createDefaultReminderSnapshot(): ReminderSnapshot {
  return {
    intervalMinutes: 60,
    quietHoursStart: 22,
    quietHoursEnd: 8,
    toleranceMinutes: 10,
    defaultSnoozeMinutes: 30,
    minGapMinutes: 20,
    remindersEnabled: true,
    nextReminderTime: null,
    currentNotificationId: null,
  };
}

interface ReminderState extends ReminderSnapshot {
  setNextReminder: (time: number | null, notificationId: string | null) => void;
  updateSettings: (patch: Partial<ReminderSnapshot>) => void;
  clearReminder: () => void;
  hydrateReminder: (snapshot: ReminderSnapshot) => void;
  resetReminder: () => void;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      ...createDefaultReminderSnapshot(),

      setNextReminder: (time, notificationId) =>
        set({ nextReminderTime: time, currentNotificationId: notificationId }),

      updateSettings: (patch) => set((state) => ({ ...state, ...patch })),

      clearReminder: () =>
        set({ nextReminderTime: null, currentNotificationId: null }),

      hydrateReminder: (snapshot) => set({ ...snapshot }),

      resetReminder: () => set(createDefaultReminderSnapshot()),
    }),
    {
      name: 'reminder-storage',
      storage: createJSONStorage(createAppStorage),
    }
  )
);
