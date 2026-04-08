import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { defaultHistorySnapshot, type HistorySnapshot } from './useHistoryStore';
import { createDefaultWaterSnapshot, type WaterSnapshot } from './useWaterStore';
import { defaultWorkoutSnapshot, type WorkoutSnapshot } from './useWorkoutStore';
import { createAppStorage } from './storage';
import { normalizeEmail } from '@/utils/email';

export interface ProfileSnapshots {
  history: HistorySnapshot;
  water: WaterSnapshot;
  workout: WorkoutSnapshot;
}

export interface UserProfile extends ProfileSnapshots {
  createdAt: number;
  email: string;
  updatedAt: number;
}

interface ProfileState {
  currentUserEmail: string | null;
  hydrated: boolean;
  profiles: Record<string, UserProfile>;
  loginWithEmail: (email: string, seedData?: ProfileSnapshots) => string | null;
  logout: () => void;
  saveCurrentUserData: (snapshots: ProfileSnapshots) => void;
  setHydrated: (value: boolean) => void;
}

function cloneSnapshots(seedData?: ProfileSnapshots): ProfileSnapshots {
  const workoutSchedule = seedData?.workout.schedule ?? defaultWorkoutSnapshot.schedule;

  return {
    history: seedData
      ? {
          history: [...seedData.history.history],
          streak: seedData.history.streak,
        }
      : {
          history: [...defaultHistorySnapshot.history],
          streak: defaultHistorySnapshot.streak,
        },
    water: seedData
      ? {
          ...seedData.water,
          drinkLogs: [...seedData.water.drinkLogs],
        }
      : {
          ...createDefaultWaterSnapshot(),
        },
    workout: seedData
      ? {
          schedule: {
            1: { ...workoutSchedule[1] },
            2: { ...workoutSchedule[2] },
            3: { ...workoutSchedule[3] },
            4: { ...workoutSchedule[4] },
            5: { ...workoutSchedule[5] },
            6: { ...workoutSchedule[6] },
            7: { ...workoutSchedule[7] },
          },
        }
      : {
          schedule: {
            1: { ...workoutSchedule[1] },
            2: { ...workoutSchedule[2] },
            3: { ...workoutSchedule[3] },
            4: { ...workoutSchedule[4] },
            5: { ...workoutSchedule[5] },
            6: { ...workoutSchedule[6] },
            7: { ...workoutSchedule[7] },
          },
        },
  };
}

function createProfile(email: string, seedData?: ProfileSnapshots): UserProfile {
  const now = Date.now();

  return {
    ...cloneSnapshots(seedData),
    createdAt: now,
    email,
    updatedAt: now,
  };
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      currentUserEmail: null,
      hydrated: false,
      profiles: {},
      loginWithEmail: (email, seedData) => {
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
          return null;
        }

        set((state) => {
          const existingProfile = state.profiles[normalizedEmail];

          return {
            currentUserEmail: normalizedEmail,
            profiles: existingProfile
              ? state.profiles
              : {
                  ...state.profiles,
                  [normalizedEmail]: createProfile(normalizedEmail, seedData),
                },
          };
        });

        return normalizedEmail;
      },
      logout: () => set({ currentUserEmail: null }),
      saveCurrentUserData: (snapshots) => {
        set((state) => {
          if (!state.currentUserEmail) {
            return state;
          }

          const currentProfile = state.profiles[state.currentUserEmail];
          if (!currentProfile) {
            return state;
          }

          return {
            profiles: {
              ...state.profiles,
              [state.currentUserEmail]: {
                ...currentProfile,
                ...cloneSnapshots(snapshots),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: 'sipup-user-database-email',
      storage: createJSONStorage(createAppStorage),
      partialize: (state) => ({
        currentUserEmail: state.currentUserEmail,
        profiles: state.profiles,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
