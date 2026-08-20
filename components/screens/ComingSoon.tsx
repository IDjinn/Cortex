import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { useTheme } from '@/theme';

import {
  Center,
  Glyph,
  HeaderBar,
  HeaderTitle,
  PhaseTag,
  ScreenHost,
  SoonText,
  SoonTitle,
} from './comingSoon.styles';

export interface ComingSoonProps {
  title: string;
  glyph: string;
  /** What will live here, shown as the empty-state copy. */
  description: string;
  /** Roadmap reference (e.g. "Fase 3 do roadmap"). */
  phase: string;
}

/**
 * Placeholder screen for workspace sections whose feature has not shipped
 * yet — keeps the sidebar complete while the roadmap catches up.
 */
export function ComingSoon({ title, glyph, description, phase }: ComingSoonProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <ScreenHost style={{ paddingTop: insets.top }}>
      <HeaderBar>
        <IconButton
          variant="ghost"
          icon={<Text style={{ color: colors.text, fontSize: 22 }}>‹</Text>}
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
        />
        <HeaderTitle>{title}</HeaderTitle>
      </HeaderBar>
      <Center>
        <Glyph>{glyph}</Glyph>
        <SoonTitle>Em breve</SoonTitle>
        <SoonText>{description}</SoonText>
        <PhaseTag>{phase}</PhaseTag>
      </Center>
    </ScreenHost>
  );
}
