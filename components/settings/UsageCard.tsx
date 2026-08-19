import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { getUsage } from '@/api';
import type { UsageResponse } from '@/api/types';
import { Card } from '@/components/ui';
import { PROVIDER_LABEL } from '@/stores/providersStore';
import { useTheme } from '@/theme';

/** Monthly token/cost breakdown per provider (authed users; costs are estimates). */
export function UsageCard() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<UsageResponse[] | null>(null);

  useEffect(() => {
    getUsage().then(setRows).catch(() => {});
  }, []);

  if (!rows || rows.length === 0) return null;

  const totalCost = rows.reduce((acc, r) => acc + (r.costUsd ?? 0), 0);
  const totalTokens = rows.reduce((acc, r) => acc + r.tokensIn + r.tokensOut, 0);
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Card $elevation={0} $padding="lg">
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
        Uso & custo — {month}
      </Text>
      {rows.map((r) => (
        <View key={r.provider} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{PROVIDER_LABEL[r.provider]}</Text>
          <Text style={{ color: colors.text, fontSize: 13 }}>
            {r.requests} req · {r.tokensIn + r.tokensOut} tokens
            {r.costUsd ? ` · $${r.costUsd.toFixed(4)}` : ''}
          </Text>
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: 6,
          paddingTop: 8,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Total</Text>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
          {totalTokens} tokens{totalCost ? ` · $${totalCost.toFixed(4)}` : ''}
        </Text>
      </View>
    </Card>
  );
}
