import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export const DRAWER_WIDTH = 304;

export const DrawerHost = styled.View`
  position: absolute;
  inset: 0;
  z-index: 50;
`;

export const DrawerSurface = styled.View`
  flex: 1;
  width: ${DRAWER_WIDTH}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-right-width: 1px;
  border-right-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

export const DrawerBody = styled.View`
  flex: 1;
  padding-horizontal: ${({ theme }) => theme.spacing.sm}px;
`;

export const TopBar = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.xs}px;
  padding-top: ${({ theme }) => theme.spacing.lg}px;
`;

export const BrandRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

export const BrandMark = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.bodyLarge}px;
  font-weight: 700;
`;

export const NewChatButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  margin-horizontal: ${({ theme }) => theme.spacing.xs}px;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceOverlay};
`;

export const NewChatLabel = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 600;
`;

export const HistoryListWrap = styled.View`
  flex: 1;
`;

export const HistoryEmpty = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding-horizontal: ${({ theme }) => theme.spacing.lg}px;
`;

export const HistoryEmptyText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  text-align: center;
`;

export const ConversationItem = styled.Pressable`
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  margin-bottom: 2px;
`;

export const ConversationTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 500;
`;

export const ConversationSub = styled.Text`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  margin-top: 2px;
`;

export const Footer = styled.View`
  border-top-width: 1px;
  border-top-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.sm}px;
  padding-bottom: ${({ theme }) => theme.spacing.lg}px;
`;

export const ProfileRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md}px;
  padding: ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
`;

export const ProfileMeta = styled.View`
  flex: 1;
`;

export const ProfileName = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 600;
`;

export const ProfileHint = styled.Text`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  margin-top: 1px;
`;
