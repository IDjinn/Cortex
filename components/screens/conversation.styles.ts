import styled from 'styled-components/native';

import type { Theme } from '@/theme/ThemeProvider';

export const ChatScreenContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

export const ChatHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  padding-vertical: ${({ theme }) => theme.spacing.sm}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

export const ChatHeaderMeta = styled.View`
  flex: 1;
  gap: 1px;
`;

export const ChatHeaderTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-weight: 600;
`;

export const ChatHeaderSubtitle = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
`;

export const ChatScroll = styled.ScrollView`
  flex: 1;
`;

export const ChatScrollContent = styled.View`
  padding-vertical: ${({ theme }) => theme.spacing.lg}px;
  padding-horizontal: ${({ theme }) => theme.spacing.sm}px;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

export const ChatComposer = styled.View`
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  padding-top: ${({ theme }) => theme.spacing.sm}px;
  padding-bottom: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-top-width: 1px;
  border-top-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

export const ComposerRow = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

export const ComposerInputWrap = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.xl}px;
  border: 1px solid ${({ theme }: { theme: Theme }) => theme.colors.border};
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  padding-vertical: ${({ theme }) => theme.spacing.sm}px;
  max-height: 160px;
`;

export const ComposerInput = styled.TextInput`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  padding: 0;
  min-height: 24px;
  text-align-vertical: top;
`;
