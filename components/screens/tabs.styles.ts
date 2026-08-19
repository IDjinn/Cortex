import { Image } from 'react-native';
import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export const HomeContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

export const TopBar = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-horizontal: ${({ theme }) => theme.spacing.sm}px;
  padding-vertical: ${({ theme }) => theme.spacing.sm}px;
`;

export const Brand = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.bodyLarge}px;
  font-weight: 700;
`;

export const EmptyStage = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding-horizontal: ${({ theme }) => theme.spacing.xl}px;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

export const BrandLogo = styled.Image`
  width: 64px;
  height: 64px;
  resize-mode: contain;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

export const GreetTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.subtitle}px;
  font-weight: 700;
  text-align: center;
`;

export const GreetSubtitle = styled.Text`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  text-align: center;
`;

export const ProvidersRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.lg}px;
  margin-top: ${({ theme }) => theme.spacing.lg}px;
`;

export const ProviderBadge = styled.Pressable`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

export const ProviderLabel = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  margin-top: ${({ theme }) => theme.spacing.xs}px;
  text-align: center;
`;

export const ProviderColumn = styled.View`
  align-items: center;
`;

export const ChatComposer = styled.View`
  padding-horizontal: ${({ theme }) => theme.spacing.lg}px;
  padding-top: ${({ theme }) => theme.spacing.sm}px;
`;

export const ModelChip = styled.Pressable`
  align-self: center;
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  padding-vertical: ${({ theme }) => theme.spacing.xs + 2}px;
  border-radius: 999px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

export const ModelChipText = styled.Text`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
`;

export const ComposerRow = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

export const ComposerInputWrap = styled.View`
  flex: 1;
  border-radius: ${({ theme }) => theme.radius.xl}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  padding-vertical: ${({ theme }) => theme.spacing.xs + 2}px;
`;

export const ComposerInput = styled.TextInput`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  padding: 0;
  min-height: 28px;
  max-height: 140px;
`;

void Image;
