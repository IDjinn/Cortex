import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ChatProviderKind, MessageRole } from '@/api/types';

/**
 * Ephemeral, device-persisted conversations for guest (unauthenticated) users.
 *
 * Guests can only use local models (Ollama, LM Studio). Conversations live
 * on-device (AsyncStorage) so they survive app restarts, but are never sent to
 * the server. When a guest logs in, the export shape (`snapshot()`) is ready to
 * be migrated to the server-side conversations store.
 */

export interface GuestConversation {
  id: string;
  title: string;
  provider: ChatProviderKind; // local providers only ('Ollama' | 'LmStudio') for guests
  model: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestMessage {
  id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  error: string | null;
  createdAt: string;
}

export interface GuestCreateInput {
  title?: string;
  provider: ChatProviderKind;
  model: string;
}

export interface GuestState {
  conversations: GuestConversation[];
  messagesByConv: Record<string, GuestMessage[]>;
  hydrated: boolean;
  create: (input: GuestCreateInput) => GuestConversation;
  getConversation: (id: string) => GuestConversation | undefined;
  messages: (id: string) => GuestMessage[];
  appendMessage: (id: string, msg: GuestMessage) => void;
  updateLastMessage: (id: string, content: string, patch?: Partial<GuestMessage>) => void;
  rename: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  setModel: (id: string, provider: ChatProviderKind, model: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortByPinnedAndUpdated(list: GuestConversation[]): GuestConversation[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function touch(list: GuestConversation[], id: string, patch: Partial<GuestConversation>): GuestConversation[] {
  return sortByPinnedAndUpdated(
    list.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)),
  );
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messagesByConv: {},
      hydrated: false,

      create: (input) => {
        const now = new Date().toISOString();
        const conv: GuestConversation = {
          id: uid('g'),
          title: input.title?.trim() || 'Nova conversa',
          provider: input.provider,
          model: input.model,
          pinned: false,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          conversations: sortByPinnedAndUpdated([conv, ...state.conversations]),
          messagesByConv: { ...state.messagesByConv, [conv.id]: [] },
        }));
        return conv;
      },

      getConversation: (id) => get().conversations.find((c) => c.id === id),

      messages: (id) => get().messagesByConv[id] ?? [],

      appendMessage: (id, msg) => {
        set((state) => {
          const existing = state.messagesByConv[id] ?? [];
          return {
            messagesByConv: { ...state.messagesByConv, [id]: [...existing, msg] },
            conversations: touch(state.conversations, id, {}),
          };
        });
      },

      updateLastMessage: (id, content, patch) => {
        set((state) => {
          const msgs = state.messagesByConv[id];
          if (!msgs || msgs.length === 0) return state;
          const lastIdx = msgs.length - 1;
          const last = msgs[lastIdx];
          const next = [...msgs];
          next[lastIdx] = { ...last, content: last.content + content, ...patch };
          return { messagesByConv: { ...state.messagesByConv, [id]: next } };
        });
      },

      rename: (id, title) => {
        set((state) => ({
          conversations: touch(state.conversations, id, { title: title.trim() || 'Nova conversa' }),
        }));
      },

      togglePin: (id) => {
        const current = get().conversations.find((c) => c.id === id);
        if (!current) return;
        set((state) => ({ conversations: touch(state.conversations, id, { pinned: !current.pinned }) }));
      },

      setModel: (id, provider, model) => {
        set((state) => ({ conversations: touch(state.conversations, id, { provider, model }) }));
      },

      remove: (id) => {
        set((state) => {
          const messagesByConv = { ...state.messagesByConv };
          delete messagesByConv[id];
          return {
            conversations: state.conversations.filter((c) => c.id !== id),
            messagesByConv,
          };
        });
      },

      clear: () => set({ conversations: [], messagesByConv: {} }),
    }),
    {
      name: 'cortex.guest.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ conversations: state.conversations, messagesByConv: state.messagesByConv }),
      onRehydrateStorage: () => () => {
        useGuestStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Sorted snapshot of all guest conversations (pinned first, then recency). */
export const selectGuestList = (s: GuestState): GuestConversation[] => s.conversations;

/** Snapshot for migration to the server when a guest logs in. */
export function guestSnapshot(): { conversations: GuestConversation[]; messagesByConv: Record<string, GuestMessage[]> } {
  const s = useGuestStore.getState();
  return { conversations: s.conversations, messagesByConv: s.messagesByConv };
}
