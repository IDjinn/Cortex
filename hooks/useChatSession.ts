import { startAnonymousStream, startChatStream, type StreamHandle } from '@/api/sse';
import { toast } from '@/components/feedback';
import { deviceKeyFor, useAuthStore, useConversationsStore, useGuestStore, useSettingsStore, type ResponseLanguage } from '@/stores';
import { DEFAULT_CONVERSATION_TITLE, deriveConversationTitle } from '@/lib/title';
import { localEndpoint } from '@/stores/localEndpointStore';
import type { AnonymousChatMessage, ChatProviderKind, ChatTurnEvent, MessageResponse } from '@/api/types';
import * as Localization from 'expo-localization';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Locale sent so the server can hint the response language. "auto" follows the
 * device locale; anything else is the user's chosen default language.
 */
function resolveLocale(pref: ResponseLanguage): string | undefined {
  if (pref !== 'auto') return pref;
  return Localization.getLocales()[0]?.languageTag ?? undefined;
}

export interface SessionConversation {
  id: string;
  title: string;
  model: string;
  provider: ChatProviderKind;
  fallbackProvider: ChatProviderKind | null;
  fallbackModel: string | null;
}

export interface UseChatSessionResult {
  conversation: SessionConversation | undefined;
  messages: MessageResponse[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
  /** Post-turn extraction proposals awaiting user confirmation (null = none). */
  memoryProposals: string[] | null;
  dismissProposals: () => void;
  send: (content: string) => Promise<void>;
  cancel: () => void;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Unifies the chat experience for authenticated and guest users.
 *
 * - Authed: conversations persist server-side; streams go to POST /api/chat.
 * - Guest: conversations live on-device; streams go to POST /api/chat/anonymous
 *   (Ollama only) and carry the full message history each turn (stateless).
 */
export function useChatSession(id: string): UseChatSessionResult {
  const isGuest = useAuthStore((s) => s.guestMode && s.status !== 'authenticated');
  const responseLanguage = useSettingsStore((s) => s.responseLanguage);

  // Authed store bindings
  const authedById = useConversationsStore((s) => s.byId);
  const authedFetchOne = useConversationsStore((s) => s.fetchOne);
  const authedAppend = useConversationsStore((s) => s.appendLocalMessage);
  const authedUpdateLast = useConversationsStore((s) => s.updateLastMessage);

  // Guest store bindings
  const guestConversations = useGuestStore((s) => s.conversations);
  const guestMessages = useGuestStore((s) => s.messagesByConv);
  const guestAppend = useGuestStore((s) => s.appendMessage);
  const guestUpdateLast = useGuestStore((s) => s.updateLastMessage);

  // Only show the initial spinner when there is nothing cached — switching
  // between conversations must feel instant (stale content renders at once).
  const [loading, setLoading] = useState<boolean>(
    !isGuest && !useConversationsStore.getState().byId[id],
  );
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoryProposals, setMemoryProposals] = useState<string[] | null>(null);
  const streamRef = useRef<StreamHandle | null>(null);

  // Initial load (authed only — guest data is already in the persisted store).
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (!useConversationsStore.getState().byId[id]) setLoading(true);
    authedFetchOne(id)
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isGuest, authedFetchOne]);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.cancel();
    };
  }, []);

  const conversation: SessionConversation | undefined = isGuest
    ? (() => {
        const c = guestConversations.find((cv) => cv.id === id);
        return c
          ? {
              id: c.id,
              title: c.title,
              model: c.model,
              provider: c.provider,
              fallbackProvider: null,
              fallbackModel: null,
            }
          : undefined;
      })()
    : (() => {
        const c = authedById[id];
        return c
          ? {
              id: c.id,
              title: c.title,
              model: c.model,
              provider: c.provider,
              fallbackProvider: (c.fallbackProvider as ChatProviderKind | null) ?? null,
              fallbackModel: c.fallbackModel ?? null,
            }
          : undefined;
      })();

  const messages: MessageResponse[] = isGuest
    ? (guestMessages[id] ?? [])
    : (authedById[id]?.messages ?? []);

  const appendMessage = useCallback(
    (msg: MessageResponse) => {
      if (isGuest) guestAppend(id, msg);
      else authedAppend(id, msg);
    },
    [id, isGuest, guestAppend, authedAppend],
  );

  const updateLast = useCallback(
    (content: string, patch?: Partial<MessageResponse>) => {
      if (isGuest) guestUpdateLast(id, content, patch);
      else authedUpdateLast(id, content, patch);
    },
    [id, isGuest, guestUpdateLast, authedUpdateLast],
  );

  const send = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || streaming || !conversation) return;

      // Read from the stores (not the render snapshot) so this is true only
      // for the very first message of the conversation.
      const isFirstTurn = isGuest
        ? useGuestStore.getState().messages(id).length === 0
        : (useConversationsStore.getState().byId[id]?.messages.length ?? 0) === 0;
      const hasDefaultTitle = isGuest
        ? (useGuestStore.getState().getConversation(id)?.title ?? DEFAULT_CONVERSATION_TITLE) ===
          DEFAULT_CONVERSATION_TITLE
        : (useConversationsStore.getState().byId[id]?.title ?? DEFAULT_CONVERSATION_TITLE) ===
          DEFAULT_CONVERSATION_TITLE;
      if (isFirstTurn && hasDefaultTitle) {
        const title = deriveConversationTitle(content);
        if (isGuest) {
          useGuestStore.getState().rename(id, title);
        } else {
          useConversationsStore.getState().rename(id, title).catch(() => {});
        }
      }

      const now = new Date().toISOString();
      const userMsg: MessageResponse = {
        id: uid('local'),
        role: 'User',
        content,
        model: null,
        tokensIn: null,
        tokensOut: null,
        error: null,
        createdAt: now,
        costUsd: null,
        reasoning: null,
      };
      const assistantPlaceholder: MessageResponse = {
        id: uid('pending'),
        role: 'Assistant',
        content: '',
        model: conversation.model,
        tokensIn: null,
        tokensOut: null,
        error: null,
        createdAt: now,
        costUsd: null,
        reasoning: null,
      };

      appendMessage(userMsg);
      appendMessage(assistantPlaceholder);

      let usage = { tokensIn: null as number | null, tokensOut: null as number | null };
      let reasoningBuf = '';
      let firstDeltaAt = 0;
      let lastDeltaAt = 0;

      const handleEvent = (evt: ChatTurnEvent) => {
        if (evt.type === 'token') {
          const t = Date.now();
          if (!firstDeltaAt) firstDeltaAt = t;
          lastDeltaAt = t;
          updateLast(evt.text);
        } else if (evt.type === 'reasoning') {
          const t = Date.now();
          if (!firstDeltaAt) firstDeltaAt = t;
          lastDeltaAt = t;
          reasoningBuf += evt.text;
          updateLast('', { reasoning: reasoningBuf });
        } else if (evt.type === 'usage') {
          usage = { tokensIn: evt.tokensIn, tokensOut: evt.tokensOut };
        } else if (evt.type === 'notice') {
          toast.show(evt.message);
        } else if (evt.type === 'completed') {
          // Generation speed: output tokens over the streaming window (first
          // delta → last delta), so queue/TTFT latency doesn't skew the rate.
          const tokensOut = evt.tokensOut ?? usage.tokensOut;
          const genSecs = firstDeltaAt ? (lastDeltaAt - firstDeltaAt) / 1000 : 0;
          const tokensPerSecond =
            tokensOut && genSecs > 0.2 ? Math.round((tokensOut / genSecs) * 10) / 10 : null;
          updateLast('', {
            tokensIn: evt.tokensIn ?? usage.tokensIn,
            tokensOut: tokensOut,
            model: evt.model ?? conversation.model,
            costUsd: evt.costUsd ?? null,
            tokensPerSecond,
            durationMs: firstDeltaAt ? Date.now() - firstDeltaAt : null,
          });
        } else if (evt.type === 'failed') {
          toast.error('Falha no streaming', evt.reason);
          updateLast('', { error: evt.reason });
        } else if (evt.type === 'memoryProposal') {
          if (evt.proposals.length > 0) setMemoryProposals(evt.proposals);
        }
      };

      const onError = (e: Error) => {
        toast.error('Erro de conexão', e.message);
      };

      setStreaming(true);

      let handle: StreamHandle;
      // BYOK: device key proxied per request (header) — never stored server-side.
      const providerKey = deviceKeyFor(conversation.provider);
      if (isGuest) {
        // Stateless: send the full history (everything except the empty placeholder).
        const all = useGuestStore.getState().messages(id);
        const history: AnonymousChatMessage[] = all.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        // Guest memories are injected client-side (the anonymous endpoint has no
        // server-side memory store) as a System message, mirroring the server budget.
        const memories = useGuestStore.getState().memories.slice(0, 12);
        let usedChars = 0;
        const lines: string[] = [];
        for (const m of memories) {
          if (usedChars + m.content.length > 2000 && lines.length > 0) break;
          lines.push(`- ${m.content}`);
          usedChars += m.content.length;
        }
        if (lines.length > 0) {
          history.unshift({
            role: 'System',
            content:
              'Known memories about the user (background context — do not mention explicitly unless relevant):\n'
              + lines.join('\n'),
          });
        }
        const isLocal = conversation.provider === 'Ollama' || conversation.provider === 'LmStudio';
        handle = startAnonymousStream({
          provider: conversation.provider,
          model: conversation.model,
          messages: history,
          locale: resolveLocale(responseLanguage),
          providerKey,
          ...(isLocal ? { baseUrl: localEndpoint() } : {}),
          onEvent: handleEvent,
          onError,
        });
      } else {
        handle = startChatStream({
          conversationId: id,
          content,
          locale: resolveLocale(responseLanguage),
          providerKey,
          onEvent: handleEvent,
          onError,
        });
      }

      streamRef.current = handle;
      try {
        await handle.done;
      } finally {
        setStreaming(false);
        streamRef.current = null;
      }
    },
    [appendMessage, conversation, id, isGuest, responseLanguage, streaming, updateLast],
  );

  const cancel = useCallback(() => {
    streamRef.current?.cancel();
  }, []);

  const dismissProposals = useCallback(() => setMemoryProposals(null), []);

  return { conversation, messages, loading, streaming, error, memoryProposals, dismissProposals, send, cancel };
}
