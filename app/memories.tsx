import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, IconButton, Input } from '@/components/ui';
import { BottomSheet } from '@/components/sheets';
import { toast } from '@/components/feedback';
import {
  buildProjectTree,
  selectIsGuest,
  useAuthStore,
  useConversationsStore,
  useGuestStore,
  useMemoriesStore,
  useProjectsStore,
  type ClearMemoryFilter,
} from '@/stores';
import type { MemoryScope } from '@/api/types';
import { useTheme } from '@/theme';

interface EditState {
  /** null = creating a new memory. */
  id: string | null;
  content: string;
  scope: MemoryScope;
  conversationId: string | null;
  projectId: string | null;
}

/**
 * Memory management (Phase 3): persistent facts injected into chats.
 * Authed memories live server-side (global / project / conversation); guest
 * memories stay on-device. Long-press a row for multi-select bulk delete;
 * each section header has a two-tap "Limpar" bulk clear.
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
  const bulkRemove = useMemoriesStore((s) => s.bulkRemove);
  const clearMemory = useMemoriesStore((s) => s.clear);

  const guestMemories = useGuestStore((s) => s.memories);
  const guestAdd = useGuestStore((s) => s.addMemory);
  const guestUpdate = useGuestStore((s) => s.updateMemory);
  const guestRemove = useGuestStore((s) => s.removeMemory);

  const conversations = useConversationsStore((s) => s.list);
  const projects = useProjectsStore((s) => s.list);
  const fetchProjects = useProjectsStore((s) => s.fetchAll);

  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  /** null = off; otherwise the set of selected memory ids. */
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [armedDelete, setArmedDelete] = useState(false);
  /** Section key whose "Limpar" is armed for the second tap. */
  const [armedClear, setArmedClear] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) return;
    setLoading(true);
    fetchAll()
      .catch((e) => toast.error('Não foi possível carregar as memórias', String(e)))
      .finally(() => setLoading(false));
    fetchProjects().catch(() => {});
  }, [isGuest, fetchAll, fetchProjects]);

  const globalList = useMemo(() => list.filter((m) => m.scope === 'Global'), [list]);
  const projectList = useMemo(() => list.filter((m) => m.scope === 'Project'), [list]);
  const conversationList = useMemo(
    () => list.filter((m) => m.scope === 'Conversation'),
    [list],
  );
  const tree = useMemo(() => buildProjectTree(projects), [projects]);
  const convTitle = useCallback(
    (id: string | null) => conversations.find((c) => c.id === id)?.title ?? 'Conversa',
    [conversations],
  );

  const toggleId = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = isGuest ? guestMemories.map((m) => m.id) : list.map((m) => m.id);
    setSelection(new Set(ids));
  };

  const performBulkDelete = async () => {
    if (!selection || selection.size === 0) return;
    if (!armedDelete) {
      setArmedDelete(true);
      return;
    }
    const ids = [...selection];
    try {
      if (isGuest) ids.forEach((id) => guestRemove(id));
      else await bulkRemove(ids);
      toast.show(`${ids.length} ${ids.length === 1 ? 'memória removida' : 'memórias removidas'}.`);
    } catch (e) {
      toast.error('Não foi possível remover', String(e));
    } finally {
      setSelection(null);
      setArmedDelete(false);
    }
  };

  const clearSection = async (key: string, filter: ClearMemoryFilter, localIds: string[]) => {
    if (armedClear !== key) {
      setArmedClear(key);
      return;
    }
    try {
      const deleted = isGuest
        ? (localIds.forEach((id) => guestRemove(id)), localIds.length)
        : await clearMemory(filter);
      toast.show(deleted > 0 ? `${deleted} ${deleted === 1 ? 'memória removida' : 'memórias removidas'}.` : 'Nada para remover.');
    } catch (e) {
      toast.error('Não foi possível limpar', String(e));
    } finally {
      setArmedClear(null);
    }
  };

  const save = async () => {
    if (!edit) return;
    const content = edit.content.trim();
    if (!content) {
      toast.error('Memória vazia', 'Escreva algo para salvar.');
      return;
    }
    if (!isGuest && !edit.id && edit.scope === 'Project' && !edit.projectId) {
      toast.error('Projeto obrigatório', 'Escolha o projeto (ou pasta) desta memória.');
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
          ...(edit.scope === 'Project' && edit.projectId ? { projectId: edit.projectId } : {}),
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
        selection ? toggleId(id) : setEdit({ id, content, scope: 'Global', conversationId: null, projectId: null })
      }
      onLongPress={() => {
        if (!selection) setSelection(new Set([id]));
      }}
      style={{
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {selection ? (
          <Text style={{ color: selection.has(id) ? colors.accent : colors.textMuted, fontSize: 16 }}>
            {selection.has(id) ? '●' : '○'}
          </Text>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{content}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{subtitle}</Text>
            {selection ? null : (
              <Button size="sm" variant="ghost" onPress={() => remove(id)}>
                Excluir
              </Button>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );

  const sectionHeader = (
    title: string,
    description: string,
    clearKey: string,
    filter: ClearMemoryFilter,
    localIds: string[],
  ) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 }}>
          {title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{description}</Text>
      </View>
      {localIds.length === 0 ? null : (
        <Button
          size="sm"
          variant={armedClear === clearKey ? 'danger' : 'ghost'}
          onPress={() => clearSection(clearKey, filter, localIds)}
        >
          {armedClear === clearKey ? 'Confirmar' : 'Limpar'}
        </Button>
      )}
    </View>
  );

  const pickerRow = (
    id: string,
    label: string,
    indent: boolean,
    active: boolean,
    onPick: (id: string) => void,
  ) => (
    <Pressable
      key={id}
      onPress={() => onPick(id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingLeft: indent ? 12 : 0,
      }}
    >
      <Text style={{ color: active ? colors.accent : colors.text, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: active ? colors.accent : colors.textMuted, fontSize: 16 }}>
        {active ? '●' : '○'}
      </Text>
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

      {selection ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
            {selection.size} selecionada{selection.size === 1 ? '' : 's'}
          </Text>
          <Button size="sm" variant="ghost" onPress={selectAll}>
            Selecionar tudo
          </Button>
          <Button
            size="sm"
            variant={armedDelete ? 'danger' : 'secondary'}
            disabled={selection.size === 0}
            onPress={performBulkDelete}
          >
            {armedDelete ? 'Confirmar exclusão' : `Excluir (${selection.size})`}
          </Button>
          <IconButton
            variant="ghost"
            icon={<Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>}
            onPress={() => {
              setSelection(null);
              setArmedDelete(false);
            }}
            accessibilityLabel="Sair da seleção"
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {loading && !isGuest ? (
          <ActivityIndicator color={colors.accent} style={{ paddingVertical: 40 }} />
        ) : (
          <>
            <Card $elevation={0} $padding="lg">
              {sectionHeader(
                'Globais',
                'Valem para todas as conversas.',
                'global',
                { scope: 'Global' },
                isGuest ? guestMemories.map((m) => m.id) : globalList.map((m) => m.id),
              )}
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
                {sectionHeader(
                  'Por projeto',
                  'Valem para as conversas do projeto e de suas pastas.',
                  'project',
                  { scope: 'Project' },
                  projectList.map((m) => m.id),
                )}
                {tree.map(({ project, folders }) => {
                  const rootMems = projectList.filter((m) => m.projectId === project.id);
                  const folderEntries = folders
                    .map((folder) => ({
                      folder,
                      mems: projectList.filter((m) => m.projectId === folder.id),
                    }))
                    .filter((e) => e.mems.length > 0);
                  if (rootMems.length === 0 && folderEntries.length === 0) return null;
                  return (
                    <View key={project.id}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 13,
                          fontWeight: '600',
                          marginTop: 10,
                          marginBottom: 2,
                        }}
                      >
                        {project.name}
                      </Text>
                      {rootMems.map((m) =>
                        renderRow(
                          m.id,
                          m.id,
                          m.content,
                          `${m.source === 'Extracted' ? 'Extraída' : 'Manual'} · ${new Date(
                            m.updatedAt,
                          ).toLocaleDateString()}`,
                        ),
                      )}
                      {folderEntries.map(({ folder, mems }) => (
                        <View key={folder.id}>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 12,
                              paddingLeft: 12,
                              marginTop: 6,
                            }}
                          >
                            {`↳ ${folder.name}`}
                          </Text>
                          {mems.map((m) =>
                            renderRow(
                              `${m.id}-folder`,
                              m.id,
                              m.content,
                              `${m.source === 'Extracted' ? 'Extraída' : 'Manual'} · ${new Date(
                                m.updatedAt,
                              ).toLocaleDateString()}`,
                            ),
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })}
                {projectList.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>
                    Nenhuma memória por projeto ainda.
                  </Text>
                ) : null}
              </Card>
            )}

            {isGuest ? null : (
              <Card $elevation={0} $padding="lg">
                {sectionHeader(
                  'Por conversa',
                  'Valem apenas dentro da conversa associada.',
                  'conversation',
                  { scope: 'Conversation' },
                  conversationList.map((m) => m.id),
                )}
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
                setEdit({ id: null, content: '', scope: 'Global', conversationId: null, projectId: null })
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
                    onPress={() => setEdit({ ...edit, scope: 'Global', conversationId: null, projectId: null })}
                  >
                    Global
                  </Button>
                  <Button
                    size="sm"
                    variant={edit.scope === 'Project' ? 'primary' : 'ghost'}
                    onPress={() =>
                      setEdit({
                        ...edit,
                        scope: 'Project',
                        conversationId: null,
                        projectId: tree[0]?.project.id ?? null,
                      })
                    }
                  >
                    Projeto
                  </Button>
                  <Button
                    size="sm"
                    variant={edit.scope === 'Conversation' ? 'primary' : 'ghost'}
                    onPress={() =>
                      setEdit({
                        ...edit,
                        scope: 'Conversation',
                        projectId: null,
                        conversationId: conversations[0]?.id ?? null,
                      })
                    }
                  >
                    Conversa
                  </Button>
                </View>
                {edit.scope === 'Project' ? (
                  tree.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      Crie um projeto no menu lateral primeiro.
                    </Text>
                  ) : (
                    <View style={{ marginTop: 4 }}>
                      {tree.map(({ project, folders }) => (
                        <View key={project.id}>
                          {pickerRow(
                            project.id,
                            project.name,
                            false,
                            edit.projectId === project.id,
                            (id) => setEdit({ ...edit, projectId: id }),
                          )}
                          {folders.map((f) =>
                            pickerRow(
                              f.id,
                              `↳ ${f.name}`,
                              true,
                              edit.projectId === f.id,
                              (id) => setEdit({ ...edit, projectId: id }),
                            ),
                          )}
                        </View>
                      ))}
                    </View>
                  )
                ) : null}
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
