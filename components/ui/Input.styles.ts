import styled from 'styled-components/native';

interface InputProps {
  $hasError: boolean;
}

export const InputField = styled.TextInput<InputProps>`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1.5px solid ${({ theme, $hasError }) => ($hasError ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  font-family: ${({ theme }) => theme.typography.fontFamily};
`;

export const InputLabel = styled.Text`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  font-weight: 600;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

export const InputHint = styled.Text<{ $error: boolean }>`
  color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.textMuted)};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  margin-top: 6px;
`;
