import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { Toaster } from '@/components/feedback';
import { ThemeProvider, useTheme } from '@/theme';
import { dark as darkColors, light as lightColors } from '@/theme/colors';
import { useAuthStore } from '@/stores';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
          <Toaster />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { mode } = useTheme();
  const router = useRouter();
  const navState = useRootNavigationState();
  const hydrated = useAuthStore((s) => s.hydrated);
  const status = useAuthStore((s) => s.status);
  const guestMode = useAuthStore((s) => s.guestMode);
  const hydrate = useAuthStore((s) => s.hydrate);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Gate navigation until auth state is hydrated AND the router is ready.
  // Unauthenticated users drop straight into the app in guest mode — no login gate.
  useEffect(() => {
    if (!hydrated || !navState?.key) return;
    if (status === 'unauthenticated' && !guestMode) {
      enterGuestMode();
      return;
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, status, guestMode, navState?.key, enterGuestMode]);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: mode === 'dark' ? darkColors.background : lightColors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="memories" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="skills" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="commands" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="mcps" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="plugins" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="tasks" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen
          name="conversation/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack>
    </>
  );
}
