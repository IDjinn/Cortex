import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export type BubbleSide = 'user' | 'assistant';

interface BubbleProps {
  $side: BubbleSide;
}

function align($side: BubbleSide) {
  return $side === 'user' ? 'flex-end' : 'flex-start';
}

function bg($side: BubbleSide, theme: Theme) {
  return $side === 'user' ? theme.colors.userBubble : theme.colors.assistantBubble;
}

function radius($side: BubbleSide, theme: Theme) {
  // Bubble "tail" — flat corner toward the avatar side.
  const r = theme.radius.lg;
  return $side === 'user'
    ? `${r}px ${r}px ${theme.radius.xs}px ${r}px`
    : `${r}px ${r}px ${r}px ${theme.radius.xs}px`;
}

export const BubbleContainer = styled.View<BubbleProps>`
  align-self: ${({ $side }) => align($side)};
  max-width: 85%;
  background-color: ${({ $side, theme }) => bg($side, theme)};
  border-radius: ${({ $side, theme }) => theme.radius.lg}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border: 1px solid
    ${({ $side, theme }) => ($side === 'assistant' ? theme.colors.border : 'transparent')};
`;

export const BubbleText = styled.Text<BubbleProps>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: ${({ theme }) => theme.typography.sizes.body * 1.45}px;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  text-align: left;
`;

export const BubbleMeta = styled.Text<BubbleProps>`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  margin-top: 4px;
  align-self: ${({ $side }) => align($side)};
`;

export const BubbleRow = styled.View<BubbleProps>`
  flex-direction: row;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.sm}px;
  justify-content: ${({ $side }) => align($side)};
  width: 100%;
  padding-horizontal: ${({ theme }) => theme.spacing.lg}px;
  margin-vertical: ${({ theme }) => theme.spacing.xs}px;
`;
