import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { getUsage } from '@/api';
import type { UsageResponse } from '@/api/types';
import { Card } from '@/components/ui';
import { PROVIDER_LABEL } from '@/stores/providersStore';
import { selectIsGuest, useAuthStore, useConversationsStore, useGuestStore, useMemoriesStore } from '@/stores';
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
 * Usage card: local statistics (conversations, messages, memories — plus
 * tokens for guests) always visible, and for authed users the cost analytics
 * (current-month totals, a 6-month token bar chart and a per-provider split).
 * Charts are pure Views — no chart dependency.
 */
export function UsageCard() {
  const { colors } = useTheme();
  const isGuest = useAuthStore(selectIsGuest);

  const authedCount = useConversationsStore((s) => s.list.length);
  const guestCount = useGuestStore((s) => s.conversations.length);
  const conversationCount = isGuest ? guestCount : authedCount;

  const authedMessageCount = useConversationsStore((s) =>
    s.list.reduce((acc, c) => acc + c.messageCount, 0),
  );
  const guestMessageCount = useGuestStore((s) =>
    Object.values(s.messagesByConv).reduce((acc, msgs) => acc + msgs.length, 0),
  );
  const guestTokens = useGuestStore((s) =>
    Object.values(s.messagesByConv).reduce(
      (acc, msgs) => acc + msgs.reduce((a, m) => a + (m.tokensIn ?? 0) + (m.tokensOut ?? 0), 0),
      0,
    ),
  );
  const authedMemories = useMemoriesStore((s) => s.list.length);
  const guestMemories = useGuestStore((s) => s.memories.length);
  const fetchMemories = useMemoriesStore((s) => s.fetchAll);

  // Authed memory count is a server list — pull it once for the stats rows.
  useEffect(() => {
    if (!isGuest) fetchMemories().catch(() => {});
  }, [isGuest, fetchMemories]);

  const messageCount = isGuest ? guestMessageCount : authedMessageCount;
  const memoryCount = isGuest ? guestMemories : authedMemories;

  const [buckets, setBuckets] = useState<MonthBucket[] | null>(null);

  useEffect(() => {
    if (isGuest) return;
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
  }, [isGuest]);

  const hasUsage = buckets !== null && buckets.some((b) => b.requests > 0);

  return (
    <Card $elevation={0} $padding="lg">
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
        Uso
      </Text>

      {/* Local statistics */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
        <Text style={{ color: colors.textSecondary }}>Conversas</Text>
        <Text style={{ color: colors.text }}>{conversationCount}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
        <Text style={{ color: colors.textSecondary }}>Mensagens</Text>
        <Text style={{ color: colors.text }}>{messageCount.toLocaleString('pt-BR')}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
        <Text style={{ color: colors.textSecondary }}>Memórias</Text>
        <Text style={{ color: colors.text }}>{memoryCount}</Text>
      </View>
      {isGuest ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <Text style={{ color: colors.textSecondary }}>Tokens processados</Text>
          <Text style={{ color: colors.text }}>{guestTokens.toLocaleString('pt-BR')}</Text>
        </View>
      ) : null}

      {hasUsage && buckets ? <UsageAnalytics buckets={buckets} /> : null}
    </Card>
  );
}

function UsageAnalytics({ buckets }: { buckets: MonthBucket[] }) {
  const { colors } = useTheme();
  const current = buckets[buckets.length - 1];
  const currentCost = current.cost;
  const maxTokens = Math.max(...buckets.map((b) => b.tokens), 1);
  const providers = [...current.rows].sort(
    (a, b) => b.tokensIn + b.tokensOut - (a.tokensIn + a.tokensOut),
  );
  const maxProviderTokens = Math.max(...providers.map((r) => r.tokensIn + r.tokensOut), 1);
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 12 }}>
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
    </>
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
