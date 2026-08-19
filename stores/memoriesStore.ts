import { create } from 'zustand';

import {
  createMemory as apiCreate,
  deleteMemory as apiDelete,
  listMemories,
  updateMemory as apiUpdate,
} from '@/api';
import type { MemoryResponse, MemoryScope } from '@/api/types';

/**
 * Server-backed memories for authed users (scoped global/conversation).
 * Guests use the device-persisted memories inside `guestStore` instead.
 */

export interface CreateMemoryInput {
  scope: MemoryScope;
  conversationId?: string;
  content: string;
}

interface MemoriesState {
  list: MemoryResponse[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  create: (input: CreateMemoryInput) => Promise<MemoryResponse>;
  update: (id: string, content: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export type { MemoriesState };

export const useMemoriesStore = create<MemoriesState>((set, get) => ({
  list: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const list = await listMemories();
      set({ list, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  create: async (input) => {
    const created = await apiCreate(input);
    set((state) => ({ list: [created, ...state.list] }));
    return created;
  },

  update: async (id, content) => {
    await apiUpdate(id, content);
    set((state) => ({
      list: state.list.map((m) =>
        m.id === id ? { ...m, content, updatedAt: new Date().toISOString() } : m,
      ),
    }));
  },

  remove: async (id) => {
    await apiDelete(id);
    set((state) => ({ list: state.list.filter((m) => m.id !== id) }));
  },
}));

/** Memories relevant to a conversation, for client-side prompt injection (mirrors the server budget). */
export function relevantMemories(
  list: MemoryResponse[],
  conversationId: string | null,
  topK = 12,
  maxChars = 2000,
): MemoryResponse[] {
  const candidates = list
    .filter((m) => m.scope === 'Global' || (conversationId && m.conversationId === conversationId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const picked: MemoryResponse[] = [];
  let used = 0;
  for (const m of candidates) {
    if (picked.length >= topK) break;
    if (used + m.content.length > maxChars && picked.length > 0) break;
    picked.push(m);
    used += m.content.length;
  }
  return picked;
}
