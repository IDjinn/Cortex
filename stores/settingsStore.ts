import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * App-wide chat preferences (Ajustes), persisted on-device.
 *
 * - `responseLanguage`: language the model is told to answer in ("auto" follows
 *   the device locale). Sent per request as `locale` and turned into a system
 *   hint server-side (ChatInstructions).
 * - `showGenerationStats`: per-message speed info (tok/s + duration) in the
 *   assistant bubble meta.
 */
export type ResponseLanguage =
  | 'auto'
  | 'pt-BR'
  | 'en-US'
  | 'es-ES'
  | 'fr-FR'
  | 'de-DE'
  | 'it-IT'
  | 'ja-JP'
  | 'zh-CN'
  | 'ru-RU';

export const RESPONSE_LANGUAGES: { value: ResponseLanguage; label: string }[] = [
  { value: 'auto', label: 'Automático (do aparelho)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'ru-RU', label: 'Русский' },
];

interface SettingsState {
  responseLanguage: ResponseLanguage;
  showGenerationStats: boolean;
  setResponseLanguage: (lang: ResponseLanguage) => void;
  setShowGenerationStats: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      responseLanguage: 'auto',
      showGenerationStats: false,
      setResponseLanguage: (responseLanguage) => set({ responseLanguage }),
      setShowGenerationStats: (showGenerationStats) => set({ showGenerationStats }),
    }),
    {
      name: 'cortex.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
