import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

interface BackdropProps {
  $opacity: number;
}

export const Backdrop = styled.View<BackdropProps>`
  position: absolute;
  inset: 0;
  background-color: #000;
  opacity: ${({ $opacity }) => $opacity};
`;

export const SheetWrap = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
`;

export const SheetSurface = styled.View`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-top-left-radius: ${({ theme }) => theme.radius.xxl}px;
  border-top-right-radius: ${({ theme }) => theme.radius.xxl}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

export const Grabber = styled.View`
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.borderStrong};
  align-self: center;
  margin-vertical: ${({ theme }) => theme.spacing.md}px;
`;
