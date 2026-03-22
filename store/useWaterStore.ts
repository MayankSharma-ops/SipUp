import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface DailyRecord {
  date: string; // Format: 'yyyy-MM-dd'
  intake: number;
  goal: number;
}

interface WaterState {
  intake: number;
  goal: number;
  lastUpdatedDate: string; // Format: 'yyyy-MM-dd'
  lastAppOpenDate: string | null;
  lastDrinkTimestamp: number | null;
  history: DailyRecord[];
  streak: number;
  
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
      history: [],
      streak: 0,

      addWater: (amount) => {
        set((state) => ({
          intake: state.intake + amount,
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

          let newStreak = state.streak;
          
          if (daysDiff === 1) {
             // It was yesterday
             if (state.intake >= state.goal) {
               newStreak += 1;
             } else {
               newStreak = 0; // Missed goal yesterday
             }
          } else if (daysDiff > 1) {
            newStreak = 0; // Missed more than a day
          }

          // Save to history
          const newRecord: DailyRecord = {
            date: state.lastUpdatedDate,
            intake: state.intake,
            goal: state.goal,
          };
          
          const newHistory = [newRecord, ...state.history].slice(0, 7); // keep last 7 days

          set({
            intake: 0, // Reset for the new day
            lastUpdatedDate: todayStr,
            history: newHistory,
            streak: newStreak
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
