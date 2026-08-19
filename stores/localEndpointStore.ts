import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Custom local inference endpoint (LM Studio / llama.cpp / Ollama on another
 * host). Applied to local providers only — sent per request as `baseUrl`
 * (models listing + anonymous chat); the server never persists it.
 */
interface LocalEndpointState {
  baseUrl: string | null;
  setBaseUrl: (url: string | null) => void;
}

export const useLocalEndpointStore = create<LocalEndpointState>()(
  persist(
    (set) => ({
      baseUrl: null,
      setBaseUrl: (url) => set({ baseUrl: url && url.trim() ? url.trim() : null }),
    }),
    {
      name: 'cortex.localEndpoint.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ baseUrl: s.baseUrl }),
    },
  ),
);

export function localEndpoint(): string | undefined {
  return useLocalEndpointStore.getState().baseUrl ?? undefined;
}
