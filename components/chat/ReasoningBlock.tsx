import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme';

import { ReasoningBody, ReasoningHeader, ReasoningHeaderText, ReasoningWrap } from './Bubble.styles';

interface ReasoningBlockProps {
  /** Chain-of-thought text streamed by the model. */
  text: string;
  /** True while the reasoning is still being streamed (shows it live). */
  active: boolean;
}

/**
 * Collapsible "thinking" block rendered above the answer in the assistant
 * bubble. While the model reasons, the text streams live; once the answer
 * starts, it collapses into a tappable header.
 */
export function ReasoningBlock({ text, active }: ReasoningBlockProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const expanded = active || open;

  return (
    <ReasoningWrap>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={active ? 'Pensando' : 'Mostrar raciocínio do modelo'}
      >
        <ReasoningHeader>
          <ReasoningHeaderText $color={colors.textSecondary}>
            {active ? 'Pensando…' : 'Raciocínio do modelo'}
          </ReasoningHeaderText>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{expanded ? '▴' : '▾'}</Text>
        </ReasoningHeader>
      </Pressable>
      {expanded ? <ReasoningBody>{text}</ReasoningBody> : null}
    </ReasoningWrap>
  );
}
