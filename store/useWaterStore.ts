import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useHistoryStore } from './useHistoryStore';

interface WaterState {
  intake: number;
  goal: number;
  lastUpdatedDate: string; // Format: 'yyyy-MM-dd'
  lastAppOpenDate: string | null;
  lastDrinkTimestamp: number | null;
  
  // Actions
  addWater: (amount: number) => void;
  resetWater: () => void;
  updateGoal: (newGoal: number) => void;
  checkNewDay: () => void;
  setLastAppOpenDate: (date: string) => void;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set, get) => ({
      intake: 0,
      goal: 3000,
      lastUpdatedDate: format(new Date(), 'yyyy-MM-dd'),
      lastAppOpenDate: null,
      lastDrinkTimestamp: null,

      addWater: (amount) => {
        if (amount <= 0) return;
        set((state) => ({
          intake: Math.min(state.intake + amount, state.goal),
          lastUpdatedDate: format(new Date(), 'yyyy-MM-dd'),
          lastDrinkTimestamp: Date.now(),
        }));
      },

      setLastAppOpenDate: (date: string) => {
        set({ lastAppOpenDate: date });
      },

      resetWater: () => {
        get().checkNewDay();
        set({
          intake: 0,
        });
      },

      updateGoal: (newGoal) => {
        set({ goal: newGoal });
      },

      checkNewDay: () => {
        const state = get();
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        if (state.lastUpdatedDate !== todayStr) {
          const lastDate = parseISO(state.lastUpdatedDate);
          const today = new Date();
          const daysDiff = differenceInDays(today, lastDate);

          // Save to history store
          if (daysDiff > 0) {
            useHistoryStore.getState().saveDailyRecord(
              {
                date: state.lastUpdatedDate,
                intake: state.intake,
                goal: state.goal,
              },
              daysDiff
            );
          }

          set({
            intake: 0, // Reset for the new day
            lastUpdatedDate: todayStr,
          });
        }
      },
    }),
    {
      name: 'water-storage',
      storage: createJSONStorage(() => {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            return window.localStorage;
          }
          return {
            getItem: () => Promise.resolve(null),
            setItem: () => Promise.resolve(),
            removeItem: () => Promise.resolve(),
          };
        }
        return AsyncStorage;
      }),
    }
  )
);
