import React from 'react';
import Markdown, { type ASTNode, type RenderRules } from 'react-native-markdown-display';

import { CodeBlock } from '@/components/code';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme/ThemeProvider';

/** `sourceInfo` (the fence info string, e.g. "ts") isn't in the public ASTNode type. */
function fenceLanguage(node: ASTNode): string | null {
  const info = (node as ASTNode & { sourceInfo?: string }).sourceInfo;
  if (!info) return null;
  const first = info.trim().split(/\s+/)[0] ?? '';
  // Strip meta like "ts:1" or "jsx title=…" — keep the language token.
  const lang = first.split(':')[0].trim();
  return lang || null;
}

// Code (fenced and indented) routes to the generic CodeBlock with syntax
// highlight + copy. Everything else uses the built-in rules.
const rules: RenderRules = {
  fence: (node) => (
    <CodeBlock
      key={node.key}
      code={node.content.replace(/\n$/, '')}
      language={fenceLanguage(node)}
    />
  ),
  code_block: (node) => (
    <CodeBlock key={node.key} code={node.content.replace(/\n$/, '')} />
  ),
};

/**
 * Markdown renderer styled against the Cortex theme.
 * Used inside AssistantBubble for the LLM's formatted output.
 */
export function MarkdownView({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Markdown rules={rules} style={makeStyles(theme)}>
      {children}
    </Markdown>
  );
}

function makeStyles(theme: Theme) {
  return {
    body: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.sizes.body * 1.5,
      fontFamily: theme.typography.fontFamily,
    },
    heading1: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.title,
      fontWeight: '700' as const,
      marginTop: 14,
      marginBottom: 6,
    },
    heading2: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.subtitle,
      fontWeight: '700' as const,
      marginTop: 12,
      marginBottom: 4,
    },
    heading3: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.bodyLarge,
      fontWeight: '600' as const,
      marginTop: 10,
      marginBottom: 4,
    },
    code_inline: {
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceOverlay,
      fontFamily: theme.typography.fontFamilyMono,
      fontSize: theme.typography.sizes.caption,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    blockquote: {
      backgroundColor: theme.colors.surfaceOverlay,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginVertical: 6,
      borderRadius: 4,
    },
    bullet_list: {
      marginVertical: 6,
    },
    ordered_list: {
      marginVertical: 6,
    },
    link: {
      color: theme.colors.accent,
      textDecorationLine: 'underline' as const,
    },
    strong: {
      fontWeight: '700' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
  };
}
