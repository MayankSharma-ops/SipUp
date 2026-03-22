import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface DrinkLog {
  timestamp: number;
  amount: number;
}

export interface DailyRecord {
  date: string; // Format: 'yyyy-MM-dd'
  intake: number;
  goal: number;
  drinkLogs?: DrinkLog[];
}

interface HistoryState {
  history: DailyRecord[];
  streak: number;
  saveDailyRecord: (record: DailyRecord, missedDays: number) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      streak: 0,
      saveDailyRecord: (record, missedDays) => {
        set((state) => {
          let newStreak = state.streak;
          
          if (missedDays === 1) {
            if (record.intake >= record.goal) {
              newStreak += 1;
            } else {
              newStreak = 0;
            }
          } else if (missedDays > 1) {
            newStreak = 0;
          }
          
          const newHistory = [record, ...state.history].slice(0, 31);
          
          return {
            streak: newStreak,
            history: newHistory,
          };
        });
      },
    }),
    {
      name: 'history-storage',
      storage: createJSONStorage(() => {
        if (Platform.OS === 'web') {
          return typeof window !== 'undefined' ? window.localStorage : {
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
