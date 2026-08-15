import styled from 'styled-components/native';

interface AvatarProps {
  $size: number;
}

export const AvatarWrap = styled.View<AvatarProps>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ $size }) => $size / 2}px;
  background-color: ${({ theme }) => theme.colors.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;

export const AvatarImage = styled.Image`
  width: 100%;
  height: 100%;
`;

export const AvatarFallback = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;
