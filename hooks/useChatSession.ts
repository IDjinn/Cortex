import { startAnonymousStream, startChatStream, type StreamHandle } from '@/api/sse';
import { toast } from '@/components/feedback';
import { deviceKeyFor, useAuthStore, useConversationsStore, useGuestStore } from '@/stores';
import type { AnonymousChatMessage, ChatProviderKind, ChatTurnEvent, MessageResponse } from '@/api/types';
import * as Localization from 'expo-localization';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Device locale (e.g. "pt-BR") sent so the server can hint the response language. */
function deviceLocale(): string | undefined {
  return Localization.getLocales()[0]?.languageTag ?? undefined;
}

export interface SessionConversation {
  id: string;
  title: string;
  model: string;
  provider: ChatProviderKind;
}

export interface UseChatSessionResult {
  conversation: SessionConversation | undefined;
  messages: MessageResponse[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
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

  const [loading, setLoading] = useState(!isGuest);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<StreamHandle | null>(null);

  // Initial load (authed only — guest data is already in the persisted store).
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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
        return c ? { id: c.id, title: c.title, model: c.model, provider: c.provider } : undefined;
      })()
    : (() => {
        const c = authedById[id];
        return c ? { id: c.id, title: c.title, model: c.model, provider: c.provider } : undefined;
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
      };

      appendMessage(userMsg);
      appendMessage(assistantPlaceholder);

      let usage = { tokensIn: null as number | null, tokensOut: null as number | null };

      const handleEvent = (evt: ChatTurnEvent) => {
        if (evt.type === 'token') {
          updateLast(evt.text);
        } else if (evt.type === 'usage') {
          usage = { tokensIn: evt.tokensIn, tokensOut: evt.tokensOut };
        } else if (evt.type === 'completed') {
          updateLast('', {
            tokensIn: evt.tokensIn ?? usage.tokensIn,
            tokensOut: evt.tokensOut ?? usage.tokensOut,
          });
        } else if (evt.type === 'failed') {
          toast.error('Falha no streaming', evt.reason);
          updateLast('', { error: evt.reason });
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
        handle = startAnonymousStream({
          provider: conversation.provider,
          model: conversation.model,
          messages: history,
          locale: deviceLocale(),
          providerKey,
          onEvent: handleEvent,
          onError,
        });
      } else {
        handle = startChatStream({
          conversationId: id,
          content,
          locale: deviceLocale(),
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
    [appendMessage, conversation, id, isGuest, streaming, updateLast],
  );

  const cancel = useCallback(() => {
    streamRef.current?.cancel();
  }, []);

  return { conversation, messages, loading, streaming, error, send, cancel };
}
