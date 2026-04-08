import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const emptyStorage: StateStorage = {
  getItem: async () => null,
  removeItem: async () => {},
  setItem: async () => {},
};

export function createAppStorage(): StateStorage {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage : emptyStorage;
  }

  return AsyncStorage;
}
