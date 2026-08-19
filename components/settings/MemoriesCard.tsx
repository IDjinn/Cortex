import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card } from '@/components/ui';
import { useGuestStore, useMemoriesStore } from '@/stores';
import { useTheme } from '@/theme';

/** Entry point to the memories management screen (authed + guest). */
export function MemoriesCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const count = useMemoriesStore((s) => s.list.length);
  const guestCount = useGuestStore((s) => s.memories.length);

  return (
    <Card $elevation={0} $padding="lg">
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
        Memórias
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>
        Fatos persistentes sobre você que o Cortex injeta nas conversas
        ({count || guestCount} salvas).
      </Text>
      <Button
        size="sm"
        onPress={() => (router as { push: (p: string) => void }).push('/memories')}
      >
        Gerenciar memórias
      </Button>
    </Card>
  );
}
