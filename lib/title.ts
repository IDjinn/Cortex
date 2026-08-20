/**
 * Conversation titles. The backend has no LLM title generation yet, so the
 * opening message derives the title client-side (first meaningful line,
 * markdown markers stripped, ellipsized) — replacing the default
 * "Nova conversa" as soon as the first message is sent.
 */

export const DEFAULT_CONVERSATION_TITLE = 'Nova conversa';

export function deriveConversationTitle(content: string, maxLen = 60): string {
  const firstLine =
    content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';

  const cleaned = firstLine
    .replace(/^#{1,6}\s+/, '') // headings
    .replace(/^(?:>|[-*+]|\d+\.)\s+/, '') // quotes / list bullets
    .replace(/[*_`]+/g, '') // emphasis / inline code markers
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return DEFAULT_CONVERSATION_TITLE;
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1).trimEnd()}…` : cleaned;
}
