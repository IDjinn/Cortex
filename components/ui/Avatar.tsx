import React, { useMemo } from 'react';

import { AvatarFallback, AvatarImage, AvatarWrap } from './Avatar.styles';

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
}

export function Avatar({ src, name, size = 40 }: AvatarProps) {
  const label = useMemo(() => initials(name), [name]);
  return (
    <AvatarWrap $size={size}>
      {src ? <AvatarImage source={{ uri: src }} /> : <AvatarFallback>{label}</AvatarFallback>}
    </AvatarWrap>
  );
}
