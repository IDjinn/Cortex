import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { BottomSheet } from '@/components/sheets';
import { Button, Input } from '@/components/ui';
import { toast } from '@/components/feedback';
import { useConversationsStore, useGuestStore } from '@/stores';
import type { ProjectResponse } from '@/api/types';
import { useTheme } from '@/theme';

import { MoveRow, MoveRowLabel, MoveRowMark, SheetSection } from './Sidebar.styles';

export interface ConversationTarget {
  id: string;
  title: string;
  pinned: boolean;
  projectId?: string | null;
}

interface ConversationActionsSheetProps {
  visible: boolean;
  conversation: ConversationTarget | null;
  isGuest: boolean;
  projects: ProjectResponse[];
  onClose: () => void;
  onDeleted: (id: string) => void;
}

type Mode = 'actions' | 'rename' | 'move';

/**
 * Long-press actions for a conversation row: rename, pin, move to project
 * (authed) and delete with a two-tap confirm.
 */
export function ConversationActionsSheet({
  visible,
  conversation,
  isGuest,
  projects,
  onClose,
  onDeleted,
}: ConversationActionsSheetProps) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('actions');
  const [title, setTitle] = useState('');
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (visible && conversation) {
      setMode('actions');
      setTitle(conversation.title);
      setArmed(false);
    }
  }, [visible, conversation]);

  if (!conversation) return null;

  const handleRename = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      if (isGuest) useGuestStore.getState().rename(conversation.id, trimmed);
      else await useConversationsStore.getState().rename(conversation.id, trimmed);
      onClose();
    } catch (e) {
      toast.error('Não foi possível renomear', String(e));
    }
  };

  const handlePin = async () => {
    try {
      if (isGuest) useGuestStore.getState().togglePin(conversation.id);
      else await useConversationsStore.getState().togglePin(conversation.id);
      onClose();
    } catch (e) {
      toast.error('Não foi possível fixar', String(e));
    }
  };

  const handleMove = async (projectId: string | null) => {
    try {
      await useConversationsStore.getState().moveToProject(conversation.id, projectId);
      toast.success(projectId ? 'Conversa movida.' : 'Conversa desarquivada.');
      onClose();
    } catch (e) {
      toast.error('Não foi possível mover', String(e));
    }
  };

  const handleDelete = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    try {
      if (isGuest) useGuestStore.getState().remove(conversation.id);
      else await useConversationsStore.getState().remove(conversation.id);
      onDeleted(conversation.id);
      toast.success('Conversa excluída.');
      onClose();
    } catch (e) {
      toast.error('Não foi possível excluir', String(e));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {mode === 'actions' ? (
        <SheetSection>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: 700 }} numberOfLines={1}>
            {conversation.title}
          </Text>
          <Button size="sm" onPress={() => setMode('rename')}>
            Renomear
          </Button>
          <Button size="sm" onPress={handlePin}>
            {conversation.pinned ? 'Desafixar' : 'Fixar'}
          </Button>
          {isGuest ? null : (
            <Button size="sm" onPress={() => setMode('move')}>
              Mover para projeto
            </Button>
          )}
          <Button size="sm" variant={armed ? 'danger' : 'ghost'} onPress={handleDelete}>
            {armed ? 'Confirmar exclusão' : 'Excluir'}
          </Button>
          <Button size="sm" variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
        </SheetSection>
      ) : null}

      {mode === 'rename' ? (
        <SheetSection>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: 700 }}>Renomear conversa</Text>
          <Input value={title} onChangeText={setTitle} autoFocus maxLength={120} selectTextOnFocus />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" onPress={handleRename}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onPress={onClose}>
              Cancelar
            </Button>
          </View>
        </SheetSection>
      ) : null}

      {mode === 'move' ? (
        <SheetSection>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
            Mover para projeto
          </Text>
          <MoveRow onPress={() => handleMove(null)}>
            <MoveRowMark>{conversation.projectId == null ? '●' : '○'}</MoveRowMark>
            <MoveRowLabel>Sem projeto</MoveRowLabel>
          </MoveRow>
          {projects.map((p) => [
            <MoveRow key={p.id} onPress={() => handleMove(p.id)}>
              <MoveRowMark>{conversation.projectId === p.id ? '●' : '○'}</MoveRowMark>
              <MoveRowLabel>{p.name}</MoveRowLabel>
            </MoveRow>,
            ...projects
              .filter((f) => f.parentId === p.id)
              .map((f) => (
                <MoveRow key={f.id} onPress={() => handleMove(f.id)} style={{ paddingLeft: 28 }}>
                  <MoveRowMark>{conversation.projectId === f.id ? '●' : '○'}</MoveRowMark>
                  <MoveRowLabel>{f.name}</MoveRowLabel>
                </MoveRow>
              )),
          ])}
          <Button size="sm" variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
        </SheetSection>
      ) : null}
    </BottomSheet>
  );
}
