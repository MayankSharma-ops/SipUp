import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createAppStorage } from './storage';

export interface DaySchedule {
  hour: number;
  minute: number;
  isRest: boolean;
}

export type WorkoutSchedule = {
  [day in 1 | 2 | 3 | 4 | 5 | 6 | 7]: DaySchedule; // 1 = Sunday, 2 = Monday
};

export interface WorkoutSnapshot {
  schedule: WorkoutSchedule;
}

interface WorkoutState extends WorkoutSnapshot {
  schedule: WorkoutSchedule;
  updateSchedule: (newSchedule: WorkoutSchedule) => void;
  hydrateWorkout: (snapshot: WorkoutSnapshot) => void;
  resetWorkout: () => void;
}

export const defaultSchedule: WorkoutSchedule = {
  2: { hour: 17, minute: 0, isRest: false }, // Mon
  3: { hour: 17, minute: 0, isRest: false }, // Tue
  4: { hour: 17, minute: 0, isRest: false }, // Wed
  5: { hour: 17, minute: 0, isRest: false }, // Thu
  6: { hour: 17, minute: 0, isRest: false }, // Fri
  7: { hour: 17, minute: 0, isRest: true },  // Sat
  1: { hour: 17, minute: 0, isRest: true },  // Sun
};

function cloneSchedule(schedule: WorkoutSchedule): WorkoutSchedule {
  return {
    1: { ...schedule[1] },
    2: { ...schedule[2] },
    3: { ...schedule[3] },
    4: { ...schedule[4] },
    5: { ...schedule[5] },
    6: { ...schedule[6] },
    7: { ...schedule[7] },
  };
}

export const defaultWorkoutSnapshot: WorkoutSnapshot = {
  schedule: cloneSchedule(defaultSchedule),
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      schedule: cloneSchedule(defaultSchedule),
      updateSchedule: (newSchedule) => set({ schedule: newSchedule }),
      hydrateWorkout: (snapshot) => set({ schedule: cloneSchedule(snapshot.schedule) }),
      resetWorkout: () => set({ schedule: cloneSchedule(defaultSchedule) }),
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(createAppStorage),
    }
  )
);
