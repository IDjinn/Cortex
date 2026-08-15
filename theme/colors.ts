/**
 * Cortex color tokens.
 *
 * Design intent: a "gray first" UI that feels quiet and editorial.
 * Dark mode keeps the gray gradient; light mode lifts the same hues
 * into a paper/white variant. Accent stays consistent across modes.
 */

export type ColorRole =
  | 'background'
  | 'surface'
  | 'surfaceRaised'
  | 'surfaceOverlay'
  | 'border'
  | 'borderStrong'
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'accent'
  | 'accentPressed'
  | 'accentText'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dangerText'
  | 'userBubble'
  | 'assistantBubble';

export type ColorMap = Record<ColorRole, string>;

const sharedAccent = {
  accent: '#6E8EF2',
  accentPressed: '#5477E0',
  accentText: '#FFFFFF',
} as const;

export const dark: ColorMap = {
  background: '#0B0B0D',
  surface: '#131317',
  surfaceRaised: '#1B1B21',
  surfaceOverlay: '#22222A',
  border: '#26262F',
  borderStrong: '#34343F',
  text: '#F2F2F5',
  textSecondary: '#A8A8B3',
  textMuted: '#6F6F7A',
  success: '#46D18C',
  warning: '#F2C261',
  danger: '#FF6B6B',
  dangerText: '#FFFFFF',
  userBubble: '#1F2230',
  assistantBubble: '#131317',
  ...sharedAccent,
};

export const light: ColorMap = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#F2F2F4',
  border: '#E6E6EA',
  borderStrong: '#CFCFD6',
  text: '#0B0B0D',
  textSecondary: '#4A4A52',
  textMuted: '#8A8A93',
  success: '#1F9D62',
  warning: '#C2820A',
  danger: '#E03B3B',
  dangerText: '#FFFFFF',
  userBubble: '#E8EDFF',
  assistantBubble: '#FFFFFF',
  ...sharedAccent,
};

export type ThemeMode = 'dark' | 'light';

export const colors = { dark, light };
