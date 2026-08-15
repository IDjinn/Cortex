import Constants from 'expo-constants';

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

export const config = {
  apiBaseUrl: pick('EXPO_PUBLIC_API_BASE_URL', extra.apiBaseUrl).replace(/\/$/, ''),
  oauthRedirect: pick('EXPO_PUBLIC_OAUTH_REDIRECT', extra.oauthRedirect) || 'cortex://auth/callback',
  scheme: 'cortex',
} as const;

export type AppConfig = typeof config;
