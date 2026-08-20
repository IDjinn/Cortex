import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AuthResponse } from '@/api';
import { useAuthStore } from '@/stores';
import { useTheme } from '@/theme';

/**
 * Landing route for the OAuth redirect (`cortex://auth/callback` in builds,
 * `exp://<dev-server>/--/auth/callback` in Expo Go). The auth-session promise
 * in useOAuthLogin usually consumes the payload; this screen covers the
 * cold-start deep link and always bounces back into the app.
 */
export default function CallbackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data?: string }>();
  const applyAuth = useAuthStore((s) => s.applyAuth);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = Array.isArray(data) ? data[0] : data;
      if (raw && useAuthStore.getState().status !== 'authenticated') {
        try {
          await applyAuth(JSON.parse(raw) as AuthResponse);
        } catch {
          // Malformed payload — fall through; the login screen handles the rest.
        }
      }
      if (!cancelled) {
        (router as { replace: (p: string) => void }).replace('/(tabs)');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, applyAuth, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    </SafeAreaView>
  );
}
