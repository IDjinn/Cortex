import type { Theme } from '@/theme/ThemeProvider';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

declare module 'styled-components/native' {
  export interface DefaultTheme extends Theme {}
}
