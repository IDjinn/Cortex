import styled from 'styled-components/native';

export const CodeBlockWrap = styled.View`
  background-color: ${({ theme }) => theme.colors.surfaceOverlay};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md}px;
  margin-vertical: 6px;
  overflow: hidden;
`;

export const CodeBlockHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

export const CodeBlockLang = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.typography.fontFamilyMono};
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

export const CodeBlockCopyButton = styled.Pressable`
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.xs}px;
  background-color: ${({ theme }) => theme.colors.surfaceRaised};
`;

interface CopyLabelProps {
  $copied: boolean;
}

export const CodeBlockCopyLabel = styled.Text<CopyLabelProps>`
  color: ${({ $copied, theme }) => ($copied ? theme.colors.success : theme.colors.textSecondary)};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  font-weight: 600;
`;

export const CodeLine = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamilyMono};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  line-height: 18px;
`;
