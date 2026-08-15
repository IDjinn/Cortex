import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export type IconButtonVariant = 'default' | 'ghost' | 'accent' | 'danger';

interface Props {
  $variant: IconButtonVariant;
  $round: boolean;
}

function bg(variant: IconButtonVariant, theme: Theme) {
  switch (variant) {
    case 'accent':
      return theme.colors.accent;
    case 'danger':
      return theme.colors.danger;
    case 'ghost':
      return 'transparent';
    default:
      return theme.colors.surfaceRaised;
  }
}

export const IconButtonContainer = styled.Pressable<Props>`
  width: 40px;
  height: 40px;
  border-radius: ${({ $round, theme }) => ($round ? 999 : theme.radius.sm)}px;
  background-color: ${({ $variant, theme }) => bg($variant, theme)};
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $variant, theme }) => ($variant === 'default' ? theme.colors.border : 'transparent')};
`;
