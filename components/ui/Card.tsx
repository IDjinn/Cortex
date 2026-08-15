import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

interface CardProps {
  $elevation: 0 | 1 | 2 | 3;
  $padding?: keyof Theme['spacing'];
}

export const Card = styled.View<CardProps>`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  padding: ${({ $padding, theme }) => theme.spacing[$padding ?? 'lg']}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  ${({ $elevation, theme }) => {
    const e = theme.elevation($elevation);
    return `
      shadow-color: ${e.shadowColor};
      shadow-offset: ${e.shadowOffset.width}px ${e.shadowOffset.height}px;
      shadow-opacity: ${e.shadowOpacity};
      shadow-radius: ${e.shadowRadius}px;
      elevation: ${e.elevation};
    `;
  }};
`;

export const Divider = styled.View`
  height: 1px;
  width: 100%;
  background-color: ${({ theme }) => theme.colors.border};
  margin-vertical: ${({ theme }) => theme.spacing.sm}px;
`;
