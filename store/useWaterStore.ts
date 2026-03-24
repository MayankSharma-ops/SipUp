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
  wakeUpTime: number | null;
  drinkLogs: { timestamp: number; amount: number }[];
  lifetimeXp: number;
  companionState: 'happy' | 'neutral' | 'sad' | 'withered';
  
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
      wakeUpTime: null,
      drinkLogs: [],
      lifetimeXp: 0,
      companionState: 'neutral',

      addWater: (amount) => {
        if (amount <= 0) return;
        set((state) => {
          const newIntake = Math.min(state.intake + amount, state.goal);
          const isGoalMet = newIntake >= state.goal;
          
          return {
            intake: newIntake,
            lastUpdatedDate: format(new Date(), 'yyyy-MM-dd'),
            lastDrinkTimestamp: Date.now(),
            drinkLogs: [...(state.drinkLogs || []), { timestamp: Date.now(), amount }],
            lifetimeXp: (state.lifetimeXp || 0) + amount,
            companionState: isGoalMet ? 'happy' : 'neutral',
          };
        });
      },

      setLastAppOpenDate: (date: string) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const state = get();
        if (state.lastAppOpenDate !== todayStr) {
          set({ lastAppOpenDate: date, wakeUpTime: Date.now() });
        } else {
          set({ lastAppOpenDate: date });
        }
      },

      resetWater: () => {
        get().checkNewDay();
        set({
          intake: 0,
          drinkLogs: [],
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

          // Determine Guilt / Decay State based on yesterday
          let nextCompanionState: 'happy'|'neutral'|'sad'|'withered' = 'neutral';
          if (daysDiff > 0) {
            if (state.intake < state.goal) {
               nextCompanionState = 'withered'; // Penalty
            } else {
               nextCompanionState = 'happy'; // Kept alive!
            }

            useHistoryStore.getState().saveDailyRecord(
              {
                date: state.lastUpdatedDate,
                intake: state.intake,
                goal: state.goal,
                drinkLogs: state.drinkLogs || [],
              },
              daysDiff
            );
          }

          set({
            intake: 0, // Reset for the new day
            lastUpdatedDate: todayStr,
            wakeUpTime: null,
            drinkLogs: [],
            companionState: nextCompanionState,
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
