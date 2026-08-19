import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ChatProviderKind } from '@/api/types';

/**
 * User's preferred default model for NEW conversations (picked in the model
 * selector). Persisted on-device; falls back to the server-configured default
 * (Providers:{Provider}:DefaultModel) when unset or no longer installed.
 */
export interface ModelPreference {
  provider: ChatProviderKind;
  model: string;
}

interface ModelPrefsState {
  preferred: ModelPreference | null;
  setPreferred: (pref: ModelPreference | null) => void;
}

export const useModelPrefsStore = create<ModelPrefsState>()(
  persist(
    (set) => ({
      preferred: null,
      setPreferred: (preferred) => set({ preferred }),
    }),
    {
      name: 'cortex.modelPrefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
