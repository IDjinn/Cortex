import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, IconButton, Input } from '@/components/ui';
import { BottomSheet } from '@/components/sheets';
import { toast } from '@/components/feedback';
import {
  selectIsGuest,
  useAuthStore,
  useConversationsStore,
  useGuestStore,
  useMemoriesStore,
} from '@/stores';
import type { MemoryScope } from '@/api/types';
import { useTheme } from '@/theme';

interface EditState {
  /** null = creating a new memory. */
  id: string | null;
  content: string;
  scope: MemoryScope;
  conversationId: string | null;
}

/**
 * Memory management (Phase 3): persistent facts injected into chats.
 * Authed memories live server-side; guest memories stay on-device.
 */
export default function MemoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isGuest = useAuthStore(selectIsGuest);

  const list = useMemoriesStore((s) => s.list);
  const fetchAll = useMemoriesStore((s) => s.fetchAll);
  const createMemory = useMemoriesStore((s) => s.create);
  const updateMemory = useMemoriesStore((s) => s.update);
  const removeMemory = useMemoriesStore((s) => s.remove);

  const guestMemories = useGuestStore((s) => s.memories);
  const guestAdd = useGuestStore((s) => s.addMemory);
  const guestUpdate = useGuestStore((s) => s.updateMemory);
  const guestRemove = useGuestStore((s) => s.removeMemory);

  const conversations = useConversationsStore((s) => s.list);

  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);

  useEffect(() => {
    if (isGuest) return;
    setLoading(true);
    fetchAll()
      .catch((e) => toast.error('Não foi possível carregar as memórias', String(e)))
      .finally(() => setLoading(false));
  }, [isGuest, fetchAll]);

  const globalList = useMemo(() => list.filter((m) => m.scope === 'Global'), [list]);
  const conversationList = useMemo(
    () => list.filter((m) => m.scope === 'Conversation'),
    [list],
  );
  const convTitle = useCallback(
    (id: string | null) => conversations.find((c) => c.id === id)?.title ?? 'Conversa',
    [conversations],
  );

  const save = async () => {
    if (!edit) return;
    const content = edit.content.trim();
    if (!content) {
      toast.error('Memória vazia', 'Escreva algo para salvar.');
      return;
    }
    try {
      if (isGuest) {
        if (edit.id) guestUpdate(edit.id, content);
        else guestAdd(content);
      } else if (edit.id) {
        await updateMemory(edit.id, content);
      } else {
        await createMemory({
          scope: edit.scope,
          ...(edit.scope === 'Conversation' && edit.conversationId
            ? { conversationId: edit.conversationId }
            : {}),
          content,
        });
      }
      toast.show('Memória salva.');
      setEdit(null);
    } catch (e) {
      toast.error('Não foi possível salvar', String(e));
    }
  };

  const remove = async (id: string) => {
    try {
      if (isGuest) guestRemove(id);
      else await removeMemory(id);
      toast.show('Memória removida.');
    } catch (e) {
      toast.error('Não foi possível remover', String(e));
    }
  };

  const renderRow = (
    key: string,
    id: string,
    content: string,
    subtitle: string | null,
  ) => (
    <Pressable
      key={key}
      onPress={() =>
        setEdit({ id, content, scope: 'Global', conversationId: null })
      }
      style={{
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{content}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{subtitle}</Text>
        <Button size="sm" variant="ghost" onPress={() => remove(id)}>
          Excluir
        </Button>
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <IconButton
          variant="ghost"
          icon={<Text style={{ color: colors.text, fontSize: 22 }}>‹</Text>}
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
        />
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Memórias</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {loading && !isGuest ? (
          <ActivityIndicator color={colors.accent} style={{ paddingVertical: 40 }} />
        ) : (
          <>
            <Card $elevation={0} $padding="lg">
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 }}>
                Globais
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                Valem para todas as conversas.
              </Text>
              {isGuest
                ? guestMemories.map((m) =>
                    renderRow(m.id, m.id, m.content, new Date(m.updatedAt).toLocaleDateString()),
                  )
                : globalList.map((m) =>
                    renderRow(
                      m.id,
                      m.id,
                      m.content,
                      `${m.source === 'Extracted' ? 'Extraída' : 'Manual'} · ${new Date(
                        m.updatedAt,
                      ).toLocaleDateString()}`,
                    ),
                  )}
              {(isGuest ? guestMemories : globalList).length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>
                  Nenhuma memória global ainda.
                </Text>
              ) : null}
            </Card>

            {isGuest ? null : (
              <Card $elevation={0} $padding="lg">
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 }}>
                  Por conversa
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                  Valem apenas dentro da conversa associada.
                </Text>
                {conversationList.map((m) =>
                  renderRow(
                    m.id,
                    m.id,
                    m.content,
                    `${convTitle(m.conversationId)} · ${new Date(m.updatedAt).toLocaleDateString()}`,
                  ),
                )}
                {conversationList.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>
                    Nenhuma memória por conversa ainda.
                  </Text>
                ) : null}
              </Card>
            )}

            <Button
              fullWidth
              onPress={() =>
                setEdit({ id: null, content: '', scope: 'Global', conversationId: null })
              }
            >
              Nova memória
            </Button>
          </>
        )}
      </ScrollView>

      <BottomSheet visible={edit !== null} onClose={() => setEdit(null)}>
        {edit ? (
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
              {edit.id ? 'Editar memória' : 'Nova memória'}
            </Text>
            <Input
              value={edit.content}
              onChangeText={(v) => setEdit({ ...edit, content: v })}
              placeholder="Ex.: Prefiro TypeScript e respostas curtas."
              multiline
              autoFocus={!edit.id}
            />
            {!isGuest && !edit.id ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Escopo</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    size="sm"
                    variant={edit.scope === 'Global' ? 'primary' : 'ghost'}
                    onPress={() => setEdit({ ...edit, scope: 'Global', conversationId: null })}
                  >
                    Global
                  </Button>
                  <Button
                    size="sm"
                    variant={edit.scope === 'Conversation' ? 'primary' : 'ghost'}
                    onPress={() =>
                      setEdit({
                        ...edit,
                        scope: 'Conversation',
                        conversationId: conversations[0]?.id ?? null,
                      })
                    }
                  >
                    Conversa
                  </Button>
                </View>
                {edit.scope === 'Conversation' ? (
                  <ScrollView horizontal style={{ marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {conversations.slice(0, 12).map((c) => (
                        <Button
                          key={c.id}
                          size="sm"
                          variant={edit.conversationId === c.id ? 'primary' : 'ghost'}
                          onPress={() => setEdit({ ...edit, conversationId: c.id })}
                        >
                          {c.title.length > 24 ? `${c.title.slice(0, 24)}…` : c.title}
                        </Button>
                      ))}
                    </View>
                  </ScrollView>
                ) : null}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button size="sm" onPress={save}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setEdit(null)}>
                Cancelar
              </Button>
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}
