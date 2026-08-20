import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import type { ChatProviderKind, ModelResponse } from '@/api/types';
import { BottomSheet } from '@/components/sheets';
import { PROVIDER_LABEL, useProvidersStore } from '@/stores/providersStore';
import { useKeysStore } from '@/stores/keysStore';
import { useTheme } from '@/theme';

type Row =
  | { type: 'header'; provider: ChatProviderKind }
  | { type: 'model'; provider: ChatProviderKind; model: ModelResponse };

export interface ModelPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  isGuest: boolean;
  selection: { provider: ChatProviderKind; model: string } | null;
  onSelect: (provider: ChatProviderKind, model: string) => void;
  /** When provided, shows the "Reserva" (fallback routing) segment. */
  fallbackSelection?: { provider: ChatProviderKind; model: string } | null;
  onSelectFallback?: (provider: ChatProviderKind | null, model: string | null) => void;
  /** Sheet heading — defaults to "Modelo". */
  title?: string;
}

function formatContext(n: number | null): string | null {
  if (!n) return null;
  if (n >= 1_000_000) return `${n % 1_000_000 === 0 ? n / 1_000_000 : (n / 1_000_000).toFixed(1)}M ctx`;
  if (n >= 1000) return `${Math.round(n / 1000)}k ctx`;
  return `${n} ctx`;
}

function formatPrice(prompt: number | null, completion: number | null): string | null {
  if (prompt == null && completion == null) return null;
  const fmt = (v: number | null) => (v == null ? '?' : `$${v < 1 ? v.toFixed(2) : v}`);
  return `${fmt(prompt)}/${fmt(completion)} por M`;
}

/**
 * Provider × model picker (BottomSheet): search across every usable provider,
 * context window and price per model, tool/vision capability badges. The
 * OpenRouter catalog is fully listed — search + price sort keep it navigable.
 */
export function ModelPickerSheet({
  visible,
  onClose,
  isGuest,
  selection,
  onSelect,
  fallbackSelection,
  onSelectFallback,
  title,
}: ModelPickerSheetProps) {
  const { colors } = useTheme();
  const hydrated = useProvidersStore((s) => s.hydrated);
  const models = useProvidersStore((s) => s.models);
  const hydrateProviders = useProvidersStore((s) => s.hydrate);
  const hydrateKeys = useKeysStore((s) => s.hydrate);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'primary' | 'fallback'>('primary');

  useEffect(() => {
    if (!visible) return;
    hydrateKeys().then(() => hydrateProviders(isGuest)).catch(() => {});
  }, [visible, isGuest, hydrateKeys, hydrateProviders]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const entries = Object.entries(models) as [ChatProviderKind, ModelResponse[]][];
    const out: Row[] = [];
    for (const [provider, list] of entries) {
      const filtered = q
        ? list.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
        : list;
      if (filtered.length === 0) continue;
      const sorted = [...filtered].sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        const ap = a.completionPrice ?? Number.POSITIVE_INFINITY;
        const bp = b.completionPrice ?? Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return a.name.localeCompare(b.name);
      });
      out.push({ type: 'header', provider });
      for (const model of sorted) out.push({ type: 'model', provider, model });
    }
    return out;
  }, [models, query]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{title ?? 'Modelo'}</Text>
        {onSelectFallback ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['primary', 'fallback'] as const).map((m) => {
              const active = mode === m;
              const label = m === 'primary' ? 'Principal' : 'Reserva (fallback)';
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: active ? colors.surfaceOverlay : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.accent : colors.border,
                  }}
                >
                  <Text style={{ color: active ? colors.accent : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {mode === 'fallback' ? (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            O reserva assume a conversa quando o modelo principal falha antes de gerar qualquer token.
          </Text>
        ) : null}
        {mode === 'fallback' && fallbackSelection ? (
          <Pressable
            onPress={() => onSelectFallback?.(null, null)}
            accessibilityRole="button"
            accessibilityLabel="Remover reserva"
            style={{ paddingVertical: 6 }}
          >
            <Text style={{ color: colors.danger, fontSize: 13 }}>Remover reserva</Text>
          </Pressable>
        ) : null}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar modelo…"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          style={{
            color: colors.text,
            fontSize: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        />
        {!hydrated ? (
          <ActivityIndicator color={colors.accent} style={{ paddingVertical: 32 }} />
        ) : rows.length === 0 ? (
          <Text style={{ color: colors.textSecondary, paddingVertical: 24, textAlign: 'center' }}>
            {query
              ? 'Nenhum modelo encontrado.'
              : 'Nenhum modelo disponível. Verifique um provider local ou adicione uma chave em Ajustes.'}
          </Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row, i) => (row.type === 'header' ? `h-${row.provider}` : `m-${row.provider}-${row.model.id}-${i}`)}
            style={{ maxHeight: 420 }}
            nestedScrollEnabled
            contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
            renderItem={({ item }) =>
              item.type === 'header' ? (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 12,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    marginTop: 8,
                    marginBottom: 4,
                  }}
                >
                  {PROVIDER_LABEL[item.provider]}
                </Text>
              ) : mode === 'fallback' && onSelectFallback ? (
                <ModelRow
                  model={item.model}
                  selected={
                    fallbackSelection?.provider === item.provider && fallbackSelection.model === item.model.id
                  }
                  onPress={() => onSelectFallback(item.provider, item.model.id)}
                />
              ) : (
                <ModelRow
                  model={item.model}
                  selected={selection?.provider === item.provider && selection.model === item.model.id}
                  onPress={() => onSelect(item.provider, item.model.id)}
                />
              )
            }
          />
        )}
      </View>
    </BottomSheet>
  );
}

function ModelRow({ model, selected, onPress }: { model: ModelResponse; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const meta = [formatContext(model.contextLength), formatPrice(model.promptPrice, model.completionPrice)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Usar ${model.name}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: pressed || selected ? colors.surfaceOverlay : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
      })}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {model.name}
          </Text>
          {model.supportsTools ? (
            <Text style={{ color: colors.textMuted, fontSize: 11 }} accessibilityLabel="Suporta ferramentas">
              ⚒
            </Text>
          ) : null}
          {model.supportsVision ? (
            <Text style={{ color: colors.textMuted, fontSize: 11 }} accessibilityLabel="Suporta visão">
              ◉
            </Text>
          ) : null}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>
          {model.id}
          {model.isDefault ? ' · padrão' : ''}
          {meta ? ` · ${meta}` : ''}
        </Text>
      </View>
      {selected ? <Text style={{ color: colors.accent, fontSize: 16 }}>✓</Text> : null}
    </Pressable>
  );
}
