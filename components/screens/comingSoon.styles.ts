import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export const ScreenHost = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

export const HeaderBar = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

export const HeaderTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.bodyLarge}px;
  font-weight: 600;
`;

export const Center = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding-horizontal: ${({ theme }) => theme.spacing.xxl}px;
`;

export const Glyph = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 40;
  margin-bottom: ${({ theme }) => theme.spacing.lg}px;
`;

export const SoonTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.subtitle}px;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

export const SoonText = styled.Text`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 22px;
  text-align: center;
`;

export const PhaseTag = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill}px;
  padding: 4px 12px;
  overflow: hidden;
`;
