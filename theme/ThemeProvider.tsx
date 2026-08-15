import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native';

import { dark as darkColors, light as lightColors, type ColorMap, type ThemeMode } from './colors';
import { colors as palette } from './colors';
import { motion } from './motion';
import { radius, spacing } from './spacing';
import { typography } from './typography';
import { elevation } from './shadows';

const STORAGE_KEY = 'cortex.theme';

export type ThemeVariant = 'system' | ThemeMode;

export interface Theme {
  mode: ThemeMode;
  variant: ThemeVariant;
  colors: ColorMap;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  motion: typeof motion;
  elevation: (level: 0 | 1 | 2 | 3) => ReturnType<typeof elevation>;
}

interface ThemeContextValue {
  theme: Theme;
  variant: ThemeVariant;
  setVariant: (v: ThemeVariant) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(variant: ThemeVariant, systemScheme: string | null | undefined): ThemeMode {
  if (variant === 'system') return systemScheme === 'light' ? 'light' : 'dark';
  return variant;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [variant, setVariantState] = useState<ThemeVariant>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setVariantState(stored as ThemeVariant);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const setVariant = useCallback((next: ThemeVariant) => {
    setVariantState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setVariantState((current) => {
      const resolved = resolveMode(current, systemScheme);
      const next: ThemeVariant = resolved === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, [systemScheme]);

  const mode = resolveMode(variant, systemScheme);

  useEffect(() => {
    if (!hydrated) return;
    // Only push to the native side when explicit. SDK 56 bridge rejects null,
    // and the ThemeProvider already resolves 'system' from useColorScheme().
    if (variant !== 'system') {
      Appearance.setColorScheme(variant);
    }
  }, [variant, hydrated]);

  const value = useMemo<ThemeContextValue>(() => {
    const theme: Theme = {
      mode,
      variant,
      colors: mode === 'dark' ? palette.dark : palette.light,
      spacing,
      radius,
      typography,
      motion,
      elevation: (level) => elevation(level, mode === 'dark' ? darkColors : lightColors),
    };
    return { theme, variant, setVariant, toggle };
  }, [mode, variant, setVariant, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={value.theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx.theme;
}

export function useThemeControls(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeControls must be used inside <ThemeProvider>');
  return ctx;
}

export { darkColors, lightColors };
export type { ColorMap, ThemeMode };
