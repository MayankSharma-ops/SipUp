import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { defaultHistorySnapshot, type HistorySnapshot } from './useHistoryStore';
import { createAppStorage } from './storage';
import { createDefaultWaterSnapshot, type WaterSnapshot } from './useWaterStore';
import { defaultWorkoutSnapshot, type WorkoutSnapshot } from './useWorkoutStore';
import { normalizeEmail } from '@/utils/email';

export interface ProfileSnapshots {
  history: HistorySnapshot;
  water: WaterSnapshot;
  workout: WorkoutSnapshot;
}

export interface UserProfile extends ProfileSnapshots {
  createdAt: number;
  email: string;
  id: string | null;
  lastLoginAt: number | null;
  updatedAt: number;
}

type RemoteUserPayload = {
  createdAt: string;
  email: string;
  id: string;
  lastLoginAt: string | null;
};

type RemoteProfilePayload = {
  profile: ProfileSnapshots;
  profileUpdatedAt: string | null;
  user: RemoteUserPayload;
};

interface ProfileState {
  currentSessionToken: string | null;
  currentUserEmail: string | null;
  currentUserId: string | null;
  hydrated: boolean;
  profiles: Record<string, UserProfile>;
  logout: () => void;
  mergeRemoteProfile: (payload: RemoteProfilePayload) => void;
  saveCurrentUserData: (snapshots: ProfileSnapshots) => void;
  setAuthenticatedSession: (payload: RemoteProfilePayload & { sessionToken: string }) => void;
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
    workout: {
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

function parseTimestamp(value: string | null | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function createProfile(
  email: string,
  seedData?: ProfileSnapshots,
  metadata?: Partial<Pick<UserProfile, 'createdAt' | 'id' | 'lastLoginAt' | 'updatedAt'>>
): UserProfile {
  const now = Date.now();

  return {
    ...cloneSnapshots(seedData),
    createdAt: metadata?.createdAt ?? now,
    email,
    id: metadata?.id ?? null,
    lastLoginAt: metadata?.lastLoginAt ?? null,
    updatedAt: metadata?.updatedAt ?? now,
  };
}

function buildProfileFromRemote(
  existingProfile: UserProfile | undefined,
  payload: RemoteProfilePayload
): UserProfile {
  const normalizedEmail = normalizeEmail(payload.user.email);
  const createdAt = parseTimestamp(payload.user.createdAt, existingProfile?.createdAt ?? Date.now());
  const lastLoginAt = payload.user.lastLoginAt
    ? parseTimestamp(payload.user.lastLoginAt, Date.now())
    : null;
  const updatedAt = parseTimestamp(payload.profileUpdatedAt, Date.now());

  return createProfile(normalizedEmail, payload.profile ?? existingProfile, {
    createdAt,
    id: payload.user.id,
    lastLoginAt,
    updatedAt,
  });
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      currentSessionToken: null,
      currentUserEmail: null,
      currentUserId: null,
      hydrated: false,
      profiles: {},
      logout: () =>
        set({
          currentSessionToken: null,
          currentUserEmail: null,
          currentUserId: null,
        }),
      mergeRemoteProfile: (payload) => {
        const normalizedEmail = normalizeEmail(payload.user.email);

        set((state) => {
          const existingProfile = state.profiles[normalizedEmail];
          const nextProfile = buildProfileFromRemote(existingProfile, payload);

          return {
            profiles: {
              ...state.profiles,
              [normalizedEmail]: nextProfile,
            },
          };
        });
      },
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
              [state.currentUserEmail]: createProfile(state.currentUserEmail, snapshots, {
                createdAt: currentProfile.createdAt,
                id: currentProfile.id,
                lastLoginAt: currentProfile.lastLoginAt,
                updatedAt: Date.now(),
              }),
            },
          };
        });
      },
      setAuthenticatedSession: (payload) => {
        const normalizedEmail = normalizeEmail(payload.user.email);

        set((state) => {
          const existingProfile = state.profiles[normalizedEmail];
          const nextProfile = buildProfileFromRemote(existingProfile, payload);

          return {
            currentSessionToken: payload.sessionToken,
            currentUserEmail: normalizedEmail,
            currentUserId: payload.user.id,
            profiles: {
              ...state.profiles,
              [normalizedEmail]: nextProfile,
            },
          };
        });
      },
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: 'sipup-neon-auth-cache',
      storage: createJSONStorage(createAppStorage),
      partialize: (state) => ({
        currentSessionToken: state.currentSessionToken,
        currentUserEmail: state.currentUserEmail,
        currentUserId: state.currentUserId,
        profiles: state.profiles,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
