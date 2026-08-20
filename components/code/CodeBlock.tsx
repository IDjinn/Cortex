import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { ThemeMode } from '@/theme/colors';

import { tokenize, type TokenType } from './highlight';
import {
  CodeBlockCopyButton,
  CodeBlockCopyLabel,
  CodeBlockHeader,
  CodeBlockLang,
  CodeBlockWrap,
  CodeLine,
} from './CodeBlock.styles';

// One Dark (dark) / GitHub (light) inspired palettes tuned for the app's
// surface colors — code blocks sit on surfaceOverlay.
const SYNTAX_COLORS: Record<ThemeMode, Record<TokenType, string>> = {
  dark: {
    plain: '#ABB2BF',
    comment: '#5C6370',
    string: '#98C379',
    number: '#D19A66',
    keyword: '#C678DD',
    builtin: '#56B6C2',
    function: '#61AFEF',
    property: '#E06C75',
    tag: '#E06C75',
    attribute: '#D19A66',
  },
  light: {
    plain: '#24292F',
    comment: '#6E7781',
    string: '#0A3069',
    number: '#0550AE',
    keyword: '#CF222E',
    builtin: '#953800',
    function: '#8250DF',
    property: '#116329',
    tag: '#116329',
    attribute: '#953800',
  },
};

export interface CodeBlockProps {
  code: string;
  /** Fence info string (e.g. "ts", "python"); unknown/absent falls back to plain text. */
  language?: string | null;
  /** Renders the language label + copy row (default true). */
  showHeader?: boolean;
}

/**
 * Generic syntax-highlighted code block with a copy button. Used by the
 * markdown renderer for LLM output, but self-contained enough to drop into
 * any surface (skills viewer, diff viewer, …).
 */
export function CodeBlock({ code, language, showHeader = true }: CodeBlockProps) {
  const { mode } = useTheme();
  const palette = SYNTAX_COLORS[mode];
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = useMemo(() => tokenize(code, language), [code, language]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const label = language?.trim() ? language.trim().toUpperCase() : 'CÓDIGO';

  return (
    <CodeBlockWrap>
      {showHeader ? (
        <CodeBlockHeader>
          <CodeBlockLang>{label}</CodeBlockLang>
          <CodeBlockCopyButton
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel="Copiar código"
          >
            <CodeBlockCopyLabel $copied={copied}>
              {copied ? 'Copiado ✓' : 'Copiar'}
            </CodeBlockCopyLabel>
          </CodeBlockCopyButton>
        </CodeBlockHeader>
      ) : null}
      {/* Horizontal scroll keeps long lines unwrapped; the inner View measures
          each line at its intrinsic width inside the unconstrained ScrollView. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8 }}
      >
        <View>
          {lines.map((tokens, i) => (
            <CodeLine key={i} selectable>
              {tokens.length === 0
                ? ' '
                : tokens.map((t, j) =>
                    t.type === 'plain' ? (
                      t.text
                    ) : (
                      <Text key={j} style={{ color: palette[t.type] }}>
                        {t.text}
                      </Text>
                    ),
                  )}
            </CodeLine>
          ))}
        </View>
      </ScrollView>
    </CodeBlockWrap>
  );
}
