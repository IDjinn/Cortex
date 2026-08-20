import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Providers that talk to a local inference server instead of a cloud API. */
export type LocalProviderKind = 'Ollama' | 'LmStudio';

/**
 * Custom local inference endpoints, one per provider (e.g. LM Studio or
 * Ollama running on another host). Applied to local providers only — sent
 * per request as `baseUrl` (models listing + anonymous chat); the server
 * never persists it. Unset = the server-side default (localhost).
 */
interface LocalEndpointState {
  endpoints: Partial<Record<LocalProviderKind, string>>;
  setEndpoint: (kind: LocalProviderKind, url: string | null) => void;
}

export const useLocalEndpointStore = create<LocalEndpointState>()(
  persist(
    (set) => ({
      endpoints: {},
      setEndpoint: (kind, url) =>
        set((state) => {
          const endpoints = { ...state.endpoints };
          if (url && url.trim()) endpoints[kind] = url.trim();
          else delete endpoints[kind];
          return { endpoints };
        }),
    }),
    {
      // Key kept from v1 so the old shared baseUrl migrates in place.
      name: 'cortex.localEndpoint.v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ endpoints: s.endpoints }),
      migrate: (persisted, version) => {
        if (version < 2) {
          // v1 stored a single shared baseUrl — it stood in for LM Studio
          // (the old placeholder/default was localhost:1234/v1).
          const old = persisted as { baseUrl?: string | null } | undefined;
          return { endpoints: old?.baseUrl ? { LmStudio: old.baseUrl } : {} };
        }
        return persisted as { endpoints: Partial<Record<LocalProviderKind, string>> };
      },
    },
  ),
);

export function localEndpoint(kind: LocalProviderKind): string | undefined {
  return useLocalEndpointStore.getState().endpoints[kind] ?? undefined;
}
