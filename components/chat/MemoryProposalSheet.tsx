import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { BottomSheet } from '@/components/sheets';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/theme';

export interface MemoryProposalSheetProps {
  visible: boolean;
  /** Raw proposals extracted from the last turn (null = nothing pending). */
  proposals: string[] | null;
  /** Confirmed proposals (edited by the user) to persist. */
  onSave: (confirmed: string[]) => void;
  onClose: () => void;
}

/** Post-turn memory extraction: the user edits and confirms what gets remembered. */
export function MemoryProposalSheet({ visible, proposals, onSave, onClose }: MemoryProposalSheetProps) {
  const { colors } = useTheme();
  const [drafts, setDrafts] = useState<string[]>([]);

  useEffect(() => {
    setDrafts(proposals ?? []);
  }, [proposals]);

  if (!proposals) return null;

  const confirm = () => {
    const confirmed = drafts.map((d) => d.trim()).filter(Boolean);
    onSave(confirmed);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ padding: 20, gap: 14 }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
            Lembrar disso?
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
            O Cortex extraiu estas informações da conversa. Edite e confirme o que
            deve ser guardado como memória.
          </Text>
        </View>
        {drafts.map((draft, i) => (
          <Input
            key={i}
            value={draft}
            onChangeText={(v) =>
              setDrafts((prev) => prev.map((d, j) => (j === i ? v : d)))
            }
            multiline
          />
        ))}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button size="sm" onPress={confirm} disabled={drafts.every((d) => !d.trim())}>
            Salvar memórias
          </Button>
          <Button size="sm" variant="ghost" onPress={onClose}>
            Ignorar
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
