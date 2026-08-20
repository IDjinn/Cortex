import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { getUsage } from '@/api';
import type { UsageResponse } from '@/api/types';
import { Card } from '@/components/ui';
import { PROVIDER_LABEL } from '@/stores/providersStore';
import { useTheme } from '@/theme';

const MONTHS_TO_FETCH = 6;
const CHART_HEIGHT = 64;

interface MonthBucket {
  key: string; // yyyy-MM
  label: string; // short month ("ago")
  tokens: number;
  requests: number;
  cost: number;
  rows: UsageResponse[];
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shortMonth(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

function fmtCompact(n: number): string {
  return n.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(n < 0.1 ? 4 : 2)}`;
}

/**
 * Usage & cost analytics (authed users; costs are estimates): current-month
 * totals, a 6-month token bar chart and a per-provider split. Charts are pure
 * Views — no chart dependency.
 */
export function UsageCard() {
  const { colors } = useTheme();
  const [buckets, setBuckets] = useState<MonthBucket[] | null>(null);

  useEffect(() => {
    const now = new Date();
    const months = Array.from({ length: MONTHS_TO_FETCH }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_TO_FETCH - 1 - k), 1);
      return d;
    });
    let cancelled = false;
    // Failed months render as empty buckets instead of dropping the chart.
    Promise.all(
      months.map(async (d) => {
        try {
          return { d, rows: await getUsage(monthKey(d)) };
        } catch {
          return { d, rows: [] as UsageResponse[] };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setBuckets(
        results.map(({ d, rows }) => ({
          key: monthKey(d),
          label: shortMonth(d),
          tokens: rows.reduce((a, r) => a + r.tokensIn + r.tokensOut, 0),
          requests: rows.reduce((a, r) => a + r.requests, 0),
          cost: rows.reduce((a, r) => a + (r.costUsd ?? 0), 0),
          rows,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!buckets) return null;
  if (buckets.every((b) => b.requests === 0)) return null;

  const current = buckets[buckets.length - 1];
  const currentCost = current.cost;
  const maxTokens = Math.max(...buckets.map((b) => b.tokens), 1);
  const providers = [...current.rows].sort(
    (a, b) => b.tokensIn + b.tokensOut - (a.tokensIn + a.tokensOut),
  );
  const maxProviderTokens = Math.max(...providers.map((r) => r.tokensIn + r.tokensOut), 1);
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Card $elevation={0} $padding="lg">
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
        Uso & custo — {month}
      </Text>

      {/* Current-month totals */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatChip value={fmtCompact(current.tokens)} label="tokens" />
        <StatChip value={current.requests.toLocaleString('pt-BR')} label="requisições" />
        {currentCost > 0 ? <StatChip value={fmtUsd(currentCost)} label="custo estimado" /> : null}
      </View>

      {/* 6-month token trend */}
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 16, marginBottom: 6 }}>
        Tokens por mês
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {buckets.map((b, i) => {
          const isCurrent = i === buckets.length - 1;
          const height = b.tokens === 0 ? 3 : Math.max(6, Math.round((b.tokens / maxTokens) * CHART_HEIGHT));
          return (
            <View key={b.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: '70%',
                  maxWidth: 22,
                  height,
                  borderRadius: 4,
                  backgroundColor: isCurrent ? colors.accent : colors.borderStrong,
                }}
              />
              <Text
                style={{
                  fontSize: 9,
                  color: isCurrent ? colors.text : colors.textMuted,
                  textTransform: 'capitalize',
                }}
              >
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Per-provider split (current month) */}
      {providers.length > 0 ? (
        <>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 16, marginBottom: 4 }}>
            Por provedor
          </Text>
          {providers.map((r) => {
            const tokens = r.tokensIn + r.tokensOut;
            const share = Math.max(4, Math.round((tokens / maxProviderTokens) * 100));
            return (
              <View key={r.provider} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {PROVIDER_LABEL[r.provider]}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 12 }}>
                    {fmtCompact(tokens)} tokens · {r.requests} req
                    {r.costUsd ? ` · ${fmtUsd(r.costUsd)}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.surfaceOverlay,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${share}%`,
                      height: '100%',
                      borderRadius: 3,
                      backgroundColor: colors.accent,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </>
      ) : null}
    </Card>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceOverlay,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>{label}</Text>
    </View>
  );
}
