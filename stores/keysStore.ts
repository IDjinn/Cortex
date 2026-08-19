import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { secureStore } from '@/api/secureStore';
import type { ChatProviderKind } from '@/api/types';

/**
 * BYOK keys held on this device (SecureStore; values stay in memory only after
 * hydrate). SecureStore has no key enumeration, so an index of provider kinds
 * lives in AsyncStorage. Vault ("account") keys are server-side — the backend
 * applies them automatically for authed requests; this store is device-only.
 */

const INDEX_KEY = 'cortex.keys.index.v1';

const secretName = (provider: ChatProviderKind) => `cortex.key.${provider}`;

export type DeviceKeys = Partial<Record<ChatProviderKind, string>>;

interface KeysState {
  deviceKeys: DeviceKeys;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDeviceKey: (provider: ChatProviderKind, key: string) => Promise<void>;
  clearDeviceKey: (provider: ChatProviderKind) => Promise<void>;
}

async function readIndex(): Promise<ChatProviderKind[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatProviderKind[];
  } catch {
    return [];
  }
}

async function writeIndex(providers: ChatProviderKind[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(providers));
}

export const useKeysStore = create<KeysState>()((set, get) => ({
  deviceKeys: {},
  hydrated: false,

  hydrate: async () => {
    const providers = await readIndex();
    const entries = await Promise.all(
      providers.map(async (p) => {
        const value = await secureStore.get(secretName(p));
        return value ? ([p, value] as const) : null;
      }),
    );
    const deviceKeys: DeviceKeys = {};
    for (const e of entries) if (e) deviceKeys[e[0]] = e[1];
    // Drop stale index entries (secret deleted outside the app).
    const live = Object.keys(deviceKeys) as ChatProviderKind[];
    if (live.length !== providers.length) await writeIndex(live);
    set({ deviceKeys, hydrated: true });
  },

  setDeviceKey: async (provider, key) => {
    await secureStore.set(secretName(provider), key);
    const providers = await readIndex();
    if (!providers.includes(provider)) await writeIndex([...providers, provider]);
    set({ deviceKeys: { ...get().deviceKeys, [provider]: key } });
  },

  clearDeviceKey: async (provider) => {
    await secureStore.remove(secretName(provider));
    const providers = await readIndex();
    await writeIndex(providers.filter((p) => p !== provider));
    const next = { ...get().deviceKeys };
    delete next[provider];
    set({ deviceKeys: next });
  },
}));

/** Current device key for a provider (may be undefined — vault/server keys apply server-side). */
export function deviceKeyFor(provider: ChatProviderKind): string | undefined {
  return useKeysStore.getState().deviceKeys[provider];
}
