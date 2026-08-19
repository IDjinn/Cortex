import * as SecureStore from 'expo-secure-store';

/**
 * Generic SecureStore wrapper (tokenStorage in client.ts covers auth tokens;
 * this one covers BYOK provider keys: `cortex.key.<Provider>`).
 * Keys are never logged and never leave the device except as request headers.
 */
export const secureStore = {
  get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
