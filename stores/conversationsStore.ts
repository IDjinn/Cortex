import { create } from 'zustand';

import {
  createConversation as apiCreate,
  deleteConversation as apiDelete,
  getConversation,
  listConversations,
  updateConversation as apiUpdate,
  type CreateConversationInput,
} from '@/api';
import type {
  ConversationDetailResponse,
  ConversationResponse,
} from '@/api/types';

interface ConversationsState {
  list: ConversationResponse[];
  byId: Record<string, ConversationDetailResponse>;
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  fetchOne: (id: string) => Promise<ConversationDetailResponse>;
  create: (input: CreateConversationInput) => Promise<ConversationDetailResponse>;
  rename: (id: string, title: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  appendLocalMessage: (id: string, msg: ConversationDetailResponse['messages'][number]) => void;
  updateLastMessage: (
    id: string,
    content: string,
    patch?: Partial<ConversationDetailResponse['messages'][number]>,
  ) => void;
}

export type { ConversationsState };

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  list: [],
  byId: {},
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const data = await listConversations();
      // pinned first, then most recently updated
      data.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      set({ list: data, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  fetchOne: async (id) => {
    const existing = get().byId[id];
    if (existing) return existing;
    const data = await getConversation(id);
    set((state) => ({ byId: { ...state.byId, [id]: data } }));
    return data;
  },

  create: async (input) => {
    const created = await apiCreate(input);
    const listItem: ConversationResponse = {
      id: created.id,
      title: created.title,
      provider: created.provider,
      model: created.model,
      pinned: created.pinned,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      messageCount: created.messages.length,
    };
    set((state) => ({
      list: [listItem, ...state.list],
      byId: { ...state.byId, [created.id]: created },
    }));
    return created;
  },

  rename: async (id, title) => {
    const updated = await apiUpdate(id, { title });
    set((state) => ({
      list: state.list.map((c) => (c.id === id ? updated : c)),
    }));
  },

  togglePin: async (id) => {
    const current = get().list.find((c) => c.id === id);
    const pinned = !current?.pinned;
    const updated = await apiUpdate(id, { pinned });
    set((state) => ({
      list: state.list.map((c) => (c.id === id ? updated : c)),
    }));
  },

  remove: async (id) => {
    await apiDelete(id);
    set((state) => {
      const byId = { ...state.byId };
      delete byId[id];
      return {
        list: state.list.filter((c) => c.id !== id),
        byId,
      };
    });
  },

  appendLocalMessage: (id, msg) => {
    set((state) => {
      const conv = state.byId[id];
      if (!conv) return state;
      return {
        byId: {
          ...state.byId,
          [id]: { ...conv, messages: [...conv.messages, msg] },
        },
      };
    });
  },

  updateLastMessage: (id, content, patch) => {
    set((state) => {
      const conv = state.byId[id];
      if (!conv) return state;
      const messages = [...conv.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx < 0) return state;
      const last = messages[lastIdx];
      messages[lastIdx] = {
        ...last,
        content: last.content + content,
        ...patch,
      };
      return {
        byId: {
          ...state.byId,
          [id]: { ...conv, messages },
        },
      };
    });
  },
}));
