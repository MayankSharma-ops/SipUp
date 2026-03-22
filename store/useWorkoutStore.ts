import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface DaySchedule {
  hour: number;
  minute: number;
  isRest: boolean;
}

export type WorkoutSchedule = {
  [day in 1 | 2 | 3 | 4 | 5 | 6 | 7]: DaySchedule; // 1 = Sunday, 2 = Monday
};

interface WorkoutState {
  schedule: WorkoutSchedule;
  updateSchedule: (newSchedule: WorkoutSchedule) => void;
}

const defaultSchedule: WorkoutSchedule = {
  2: { hour: 17, minute: 0, isRest: false }, // Mon
  3: { hour: 17, minute: 0, isRest: false }, // Tue
  4: { hour: 17, minute: 0, isRest: false }, // Wed
  5: { hour: 17, minute: 0, isRest: false }, // Thu
  6: { hour: 17, minute: 0, isRest: false }, // Fri
  7: { hour: 17, minute: 0, isRest: true },  // Sat
  1: { hour: 17, minute: 0, isRest: true },  // Sun
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      schedule: defaultSchedule,
      updateSchedule: (newSchedule) => set({ schedule: newSchedule }),
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => {
        if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.localStorage : { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
        return AsyncStorage;
      }),
    }
  )
);
