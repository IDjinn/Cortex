import { getAuthHeader } from './client';
import { config } from '@/config';
import type { AnonymousChatMessage, ChatProviderKind, ChatTurnEvent } from './types';

/**
 * Minimal SSE client for the Cortex streaming endpoints.
 *
 * RN's fetch supports response body streaming on iOS/Android. We read the
 * ReadableStream chunk-by-chunk, parse SSE frames separated by `\n\n`, and
 * dispatch each frame's `event:` + `data:` lines as a normalized ChatTurnEvent.
 */
export interface StreamHandle {
  /** Aborts the underlying request (also tells the server via AbortController). */
  cancel: () => void;
  /** Resolves when the stream ends (success or failure). */
  done: Promise<void>;
}

type EventCallback = (event: ChatTurnEvent) => void;

export interface StartStreamOptions {
  conversationId: string;
  content: string;
  /** Device locale (e.g. "pt-BR") — server turns it into a language hint. */
  locale?: string;
  onEvent: EventCallback;
  onError?: (err: Error) => void;
}

export interface StartAnonymousStreamOptions {
  provider: ChatProviderKind;
  model: string;
  messages: AnonymousChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Device locale (e.g. "pt-BR") — server turns it into a language hint. */
  locale?: string;
  onEvent: EventCallback;
  onError?: (err: Error) => void;
}

/** Maps a parsed SSE frame to a normalized event, or null to ignore it. */
function toChatTurnEvent(eventType: string | undefined, data: unknown): ChatTurnEvent | null {
  switch (eventType) {
    case 'token': {
      const text = (data as { value?: string } | null)?.value ?? '';
      return { type: 'token', text };
    }
    case 'usage': {
      const d = data as { tokensIn?: number; tokensOut?: number } | null;
      return { type: 'usage', tokensIn: d?.tokensIn ?? 0, tokensOut: d?.tokensOut ?? 0 };
    }
    case 'done': {
      const d = data as { tokensIn?: number; tokensOut?: number } | null;
      return { type: 'completed', tokensIn: d?.tokensIn ?? null, tokensOut: d?.tokensOut ?? null };
    }
    case 'error': {
      const message = (data as { message?: string } | null)?.message ?? 'Erro desconhecido';
      return { type: 'failed', reason: message };
    }
    default:
      // Ignore keepalives/comments and events we don't surface to the UI
      // (e.g. `user`/`assistant` message-id hints from the authed endpoint).
      return null;
  }
}

/** Reads an SSE response stream, dispatching normalized events. */
async function consumeStream(body: ReadableStream<Uint8Array>, onEvent: EventCallback): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // eslint-disable-next-line no-constant-condition
  let reading = true;
  while (reading) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) {
      reading = false;
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    let sep = buffer.indexOf('\n\n');
    while (sep >= 0) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let eventType: string | undefined;
      const dataLines: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (eventType) {
        const raw = dataLines.join('\n');
        if (raw.length === 0 || raw === ': heartbeat') {
          sep = buffer.indexOf('\n\n');
          continue;
        }
        let data: unknown = null;
        try {
          data = raw === 'null' ? null : JSON.parse(raw);
        } catch {
          sep = buffer.indexOf('\n\n');
          continue;
        }
        const evt = toChatTurnEvent(eventType, data);
        if (evt) onEvent(evt);
      }

      sep = buffer.indexOf('\n\n');
    }
  }
}

interface RunOptions {
  url: string;
  body: unknown;
  /** Async so the authed stream can resolve/refresh the bearer token first. */
  getHeaders: () => Promise<Record<string, string>>;
  onEvent: EventCallback;
  onError?: (err: Error) => void;
}

function runStream(opts: RunOptions): StreamHandle {
  const controller = new AbortController();
  let resolveDone: () => void;
  let rejectDone: (err: Error) => void;
  const done = new Promise<void>((res, rej) => {
    resolveDone = res;
    rejectDone = rej;
  });

  (async () => {
    try {
      const headers = await opts.getHeaders();
      const res = await fetch(opts.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...headers },
        body: JSON.stringify(opts.body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }

      await consumeStream(res.body, opts.onEvent);
      resolveDone!();
    } catch (err) {
      const e = err as Error;
      if (e.name !== 'AbortError') {
        opts.onError?.(e);
        rejectDone!(e);
      } else {
        resolveDone!();
      }
    }
  })();

  return {
    cancel: () => controller.abort(),
    done,
  };
}

/** Authed streaming chat — POST /api/chat with { conversationId, content } in the body. */
export function startChatStream(opts: StartStreamOptions): StreamHandle {
  return runStream({
    url: `${config.apiBaseUrl}/api/chat`,
    body: {
      conversationId: opts.conversationId,
      content: opts.content,
      ...(opts.locale ? { locale: opts.locale } : {}),
    },
    getHeaders: async (): Promise<Record<string, string>> => {
      const token = await getAuthHeader();
      const h: Record<string, string> = {};
      if (token) h.Authorization = `Bearer ${token}`;
      return h;
    },
    onEvent: opts.onEvent,
    onError: opts.onError,
  });
}

/** Guest (anonymous) streaming chat — POST /api/chat/anonymous, no auth header. */
export function startAnonymousStream(opts: StartAnonymousStreamOptions): StreamHandle {
  return runStream({
    url: `${config.apiBaseUrl}/api/chat/anonymous`,
    body: {
      provider: opts.provider,
      model: opts.model,
      messages: opts.messages,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
      ...(opts.locale ? { locale: opts.locale } : {}),
    },
    getHeaders: async () => ({}),
    onEvent: opts.onEvent,
    onError: opts.onError,
  });
}
