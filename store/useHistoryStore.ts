import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createAppStorage } from './storage';

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

export interface HistorySnapshot {
  history: DailyRecord[];
  streak: number;
}

export const defaultHistorySnapshot: HistorySnapshot = {
  history: [],
  streak: 0,
};

interface HistoryState extends HistorySnapshot {
  history: DailyRecord[];
  streak: number;
  saveDailyRecord: (record: DailyRecord, missedDays: number) => void;
  hydrateHistory: (snapshot: HistorySnapshot) => void;
  resetHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      ...defaultHistorySnapshot,
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
      hydrateHistory: (snapshot) =>
        set({
          history: snapshot.history,
          streak: snapshot.streak,
        }),
      resetHistory: () => set({ ...defaultHistorySnapshot }),
    }),
    {
      name: 'history-storage',
      storage: createJSONStorage(createAppStorage),
    }
  )
);
