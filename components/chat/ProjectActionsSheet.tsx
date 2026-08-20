import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { BottomSheet } from '@/components/sheets';
import { Button, Input } from '@/components/ui';
import { toast } from '@/components/feedback';
import { useConversationsStore, useProjectsStore } from '@/stores';
import type { ProjectResponse } from '@/api/types';
import { useTheme } from '@/theme';

import { SheetSection } from './Sidebar.styles';

interface ProjectActionsSheetProps {
  visible: boolean;
  /** The project or folder being acted on; null closes the sheet content. */
  project: ProjectResponse | null;
  onClose: () => void;
}

type Mode = 'actions' | 'rename' | 'newFolder';

/**
 * Long-press actions for a project/folder row: rename, add a folder (roots
 * only) and delete with a two-tap confirm. Deleting unfiles conversations
 * server-side (they are never deleted), so the conversation list is re-fetched.
 */
export function ProjectActionsSheet({ visible, project, onClose }: ProjectActionsSheetProps) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('actions');
  const [name, setName] = useState('');
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (visible && project) {
      setMode('actions');
      setName(project.name);
      setArmed(false);
    }
  }, [visible, project]);

  if (!project) return null;
  const isFolder = project.parentId !== null;

  const handleRename = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await useProjectsStore.getState().rename(project.id, trimmed);
      onClose();
    } catch (e) {
      toast.error('Não foi possível renomear', String(e));
    }
  };

  const handleCreateFolder = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await useProjectsStore.getState().create({ name: trimmed, parentId: project.id });
      toast.success('Pasta criada.');
      onClose();
    } catch (e) {
      toast.error('Não foi possível criar a pasta', String(e));
    }
  };

  const handleDelete = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    try {
      await useProjectsStore.getState().remove(project.id);
      // The server unfiles conversations that pointed here — resync the list.
      await useConversationsStore.getState().fetchAll().catch(() => {});
      toast.success(isFolder ? 'Pasta excluída.' : 'Projeto excluído.');
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
            {project.name}
          </Text>
          <Button size="sm" onPress={() => setMode('rename')}>
            Renomear
          </Button>
          {isFolder ? null : (
            <Button size="sm" onPress={() => setMode('newFolder')}>
              Nova pasta
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
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: 700 }}>
            {isFolder ? 'Renomear pasta' : 'Renomear projeto'}
          </Text>
          <Input value={name} onChangeText={setName} autoFocus maxLength={100} selectTextOnFocus />
          <Button size="sm" onPress={handleRename}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
        </SheetSection>
      ) : null}

      {mode === 'newFolder' ? (
        <SheetSection>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: 700 }}>Nova pasta</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Dentro de “{project.name}”. Ex.: backend, frontend.
          </Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Nome da pasta"
            autoFocus
            maxLength={100}
          />
          <Button size="sm" onPress={handleCreateFolder}>
            Criar
          </Button>
          <Button size="sm" variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
        </SheetSection>
      ) : null}
    </BottomSheet>
  );
}
