import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * App runtime configuration.
 *
 * Reads EXPO_PUBLIC_* env vars (set via .env, .env.development, EAS secrets).
 * Falls back to app.json `extra` when env vars are absent.
 */

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  oauthRedirect?: string;
};

function pick(envKey: string, fallback: string | undefined): string {
  const value = process.env[envKey];
  if (value && value.length > 0) return value;
  return fallback ?? '';
}

// Expo Go never registers the project's custom scheme on the device (only
// exp:// reaches the experience), and on web the env value would point away
// from the app origin — in both cases the redirect must be derived at runtime.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const runtimeRedirect = Linking.createURL('auth/callback');
const envRedirect = pick('EXPO_PUBLIC_OAUTH_REDIRECT', extra.oauthRedirect);

export const config = {
  apiBaseUrl: pick('EXPO_PUBLIC_API_BASE_URL', extra.apiBaseUrl).replace(/\/$/, ''),
  oauthRedirect:
    Platform.OS === 'web' || isExpoGo ? runtimeRedirect : envRedirect || runtimeRedirect,
  scheme: 'cortex',
} as const;

export type AppConfig = typeof config;
