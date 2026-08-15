import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface ToastSurfaceProps {
  $variant: ToastVariant;
}

function accentByVariant(variant: ToastVariant, theme: Theme) {
  switch (variant) {
    case 'success':
      return theme.colors.success;
    case 'error':
      return theme.colors.danger;
    case 'warning':
      return theme.colors.warning;
    default:
      return theme.colors.accent;
  }
}

export const ToastViewport = styled.View`
  position: absolute;
  left: ${({ theme }) => theme.spacing.lg}px;
  right: ${({ theme }) => theme.spacing.lg}px;
  top: 0;
  z-index: 9999;
`;

export const ToastSurface = styled.View<ToastSurfaceProps>`
  background-color: ${({ theme }) => theme.colors.surfaceRaised};
  border-left-color: ${({ $variant, theme }) => accentByVariant($variant, theme)};
  border-left-width: 3px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  shadow-color: #000;
  shadow-offset: 0 4px;
  shadow-opacity: 0.22;
  shadow-radius: 12px;
  elevation: 3;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

export const ToastTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily};
`;

export const ToastDescription = styled.Text`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  margin-top: 2px;
`;
