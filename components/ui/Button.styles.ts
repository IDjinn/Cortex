import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface StyledButtonProps {
  $variant: ButtonVariant;
  $fullWidth: boolean;
  $size: 'sm' | 'md' | 'lg';
}

function sizePadding(size: StyledButtonProps['$size']) {
  switch (size) {
    case 'sm':
      return '6px 12px';
    case 'lg':
      return '14px 22px';
    default:
      return '10px 18px';
  }
}

function sizeFont(size: StyledButtonProps['$size']) {
  switch (size) {
    case 'sm':
      return '13px';
    case 'lg':
      return '17px';
    default:
      return '15px';
  }
}

function variantBackground(variant: ButtonVariant, theme: Theme) {
  switch (variant) {
    case 'primary':
      return theme.colors.accent;
    case 'danger':
      return theme.colors.danger;
    case 'secondary':
      return theme.colors.surfaceRaised;
    case 'ghost':
      return 'transparent';
  }
}

function variantBorder(variant: ButtonVariant, theme: Theme) {
  if (variant === 'ghost') return '1.5px solid transparent';
  if (variant === 'secondary') return `1px solid ${theme.colors.border}`;
  return '1px solid transparent';
}

function variantColor(variant: ButtonVariant, theme: Theme) {
  if (variant === 'primary' || variant === 'danger') return theme.colors.accentText;
  return theme.colors.text;
}

export const ButtonContainer = styled.Pressable<StyledButtonProps>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${({ $size }) => sizePadding($size)};
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ $variant, theme }) => variantBackground($variant, theme)};
  border: ${({ $variant, theme }) => variantBorder($variant, theme)};
  align-self: ${({ $fullWidth }) => ($fullWidth ? 'stretch' : 'flex-start')};
  ${({ $fullWidth }) => ($fullWidth ? 'width: 100%;' : '')}
`;

export const ButtonLabel = styled.Text<StyledButtonProps>`
  color: ${({ $variant, theme }) => variantColor($variant, theme)};
  font-size: ${({ $size }) => sizeFont($size)};
  font-weight: 600;
  text-align: center;
`;
