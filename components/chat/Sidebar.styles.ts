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

// ---- Workspace sections ----

export const SectionHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.xs}px
    ${({ theme }) => theme.spacing.xs}px;
`;

export const SectionLabel = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

export const SectionAction = styled.Pressable`
  padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radius.xs}px;
`;

export const SectionActionLabel = styled.Text`
  color: ${({ theme }) => theme.colors.accentText};
  font-size: 20;
  font-weight: 600;
`;

export const SectionHint = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.xs}px
    ${({ theme }) => theme.spacing.sm}px;
`;

export const TreeRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.xs}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  margin-bottom: 2px;
`;

export const TreeChevron = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13;
  width: 14px;
  text-align: center;
`;

export const TreeName = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 600;
`;

export const TreeCount = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  min-width: 18px;
  text-align: right;
`;

export const TreeNewChat = styled.Pressable`
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.xs}px;
`;

export const TreeNewChatLabel = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 17;
  font-weight: 600;
`;

export const Indented = styled.View`
  padding-left: ${({ theme }) => theme.spacing.xl}px;
`;

export const IndentedDeep = styled.View`
  padding-left: ${({ theme }) => theme.spacing.xxxl}px;
`;

export const NavRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.xs}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
`;

export const NavLabel = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 500;
`;

export const NavChevron = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 18;
`;

export const NavBadge = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill}px;
  padding: 1px 8px;
  overflow: hidden;
`;

// ---- Action sheets (rendered inside BottomSheet) ----

export const SheetSection = styled.View`
  padding: 20px;
  gap: 10px;
`;

export const MoveRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.xs}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
`;

export const MoveRowLabel = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 500;
`;

export const MoveRowMark = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 11;
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
