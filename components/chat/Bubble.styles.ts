import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export type BubbleSide = 'user' | 'assistant';

interface BubbleProps {
  $side: BubbleSide;
  /** Hug the content instead of the assistant's stable full width (typing dots). */
  $hug?: boolean;
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

// Assistant bubbles stretch to a stable full width (like ChatGPT's answer
// column): toggling the reasoning block must not resize the bubble, and code
// blocks get the widest possible surface. `$hug` opts out for tiny content
// (the "…" placeholder). User bubbles always hug their content.
export const BubbleContainer = styled.View<BubbleProps>`
  align-self: ${({ $side, $hug }) =>
    $hug ? align($side) : $side === 'user' ? 'flex-end' : 'stretch'};
  max-width: ${({ $side }) => ($side === 'user' ? '85%' : '100%')};
  background-color: ${({ $side, theme }) => bg($side, theme)};
  border-radius: ${({ $side, theme }) => radius($side, theme)};
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

// ---- Reasoning (model thinking) ----

export const ReasoningWrap = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  padding-bottom: ${({ theme }) => theme.spacing.xs}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

export const ReasoningHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

interface ReasoningHeaderTextProps {
  $color: string;
}

export const ReasoningHeaderText = styled.Text<ReasoningHeaderTextProps>`
  color: ${({ $color }) => $color};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  font-weight: 600;
`;

export const ReasoningBody = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption + 1}px;
  line-height: 18px;
  margin-top: 6px;
`;
