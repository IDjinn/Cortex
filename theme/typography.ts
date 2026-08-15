import { Platform } from 'react-native';

const baseFontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  fontFamily: baseFontFamily,
  fontFamilyMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
  sizes: {
    caption: 12,
    body: 15,
    bodyLarge: 17,
    subtitle: 20,
    title: 24,
    largeTitle: 34,
  },
  lineHeights: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.45,
    relaxed: 1.6,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
