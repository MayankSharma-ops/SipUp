import { differenceInDays, format, parseISO } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useHistoryStore } from './useHistoryStore';
import { createAppStorage } from './storage';

export interface DrinkLog {
  timestamp: number;
  amount: number;
}

export interface WaterSnapshot {
  intake: number;
  goal: number;
  lastUpdatedDate: string;
  lastAppOpenDate: string | null;
  lastDrinkTimestamp: number | null;
  wakeUpTime: number | null;
  drinkLogs: DrinkLog[];
  lifetimeXp: number;
  companionState: 'happy' | 'neutral' | 'sad' | 'withered';
}

export function createDefaultWaterSnapshot(): WaterSnapshot {
  return {
    intake: 0,
    goal: 3000,
    lastUpdatedDate: format(new Date(), 'yyyy-MM-dd'),
    lastAppOpenDate: null,
    lastDrinkTimestamp: null,
    wakeUpTime: null,
    drinkLogs: [],
    lifetimeXp: 0,
    companionState: 'neutral',
  };
}

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
  hydrateWater: (snapshot: WaterSnapshot) => void;
  resetWaterProfile: () => void;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set, get) => ({
      ...createDefaultWaterSnapshot(),

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
      hydrateWater: (snapshot) => {
        set({
          companionState: snapshot.companionState,
          drinkLogs: snapshot.drinkLogs,
          goal: snapshot.goal,
          intake: snapshot.intake,
          lastAppOpenDate: snapshot.lastAppOpenDate,
          lastDrinkTimestamp: snapshot.lastDrinkTimestamp,
          lastUpdatedDate: snapshot.lastUpdatedDate,
          lifetimeXp: snapshot.lifetimeXp,
          wakeUpTime: snapshot.wakeUpTime,
        });
      },
      resetWaterProfile: () => set(createDefaultWaterSnapshot()),

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
      storage: createJSONStorage(createAppStorage),
    }
  )
);
