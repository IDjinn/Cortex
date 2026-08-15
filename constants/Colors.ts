import { dark, light } from '@/theme/colors';

const tintColor = '#6E8EF2';

export default {
  light: {
    text: light.text,
    background: light.background,
    tint: tintColor,
    tabIconDefault: light.textMuted,
    tabIconSelected: tintColor,
  },
  dark: {
    text: dark.text,
    background: dark.background,
    tint: tintColor,
    tabIconDefault: dark.textMuted,
    tabIconSelected: tintColor,
  },
};
