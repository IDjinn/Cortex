import { create } from 'zustand';

import {
  bulkDeleteMemories as apiBulkDelete,
  clearMemories as apiClear,
  createMemory as apiCreate,
  deleteMemory as apiDelete,
  listMemories,
  updateMemory as apiUpdate,
} from '@/api';
import type { MemoryResponse, MemoryScope } from '@/api/types';

/**
 * Server-backed memories for authed users (scoped global/project/conversation).
 * Guests use the device-persisted memories inside `guestStore` instead.
 */

export interface CreateMemoryInput {
  scope: MemoryScope;
  conversationId?: string;
  projectId?: string;
  content: string;
}

export interface ClearMemoryFilter {
  scope?: MemoryScope;
  projectId?: string;
  conversationId?: string;
}

interface MemoriesState {
  list: MemoryResponse[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  create: (input: CreateMemoryInput) => Promise<MemoryResponse>;
  update: (id: string, content: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  bulkRemove: (ids: string[]) => Promise<number>;
  clear: (filter: ClearMemoryFilter) => Promise<number>;
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

  bulkRemove: async (ids) => {
    const { deleted } = await apiBulkDelete(ids);
    const gone = new Set(ids);
    set((state) => ({ list: state.list.filter((m) => !gone.has(m.id)) }));
    return deleted;
  },

  clear: async (filter) => {
    const { deleted } = await apiClear(filter);
    set((state) => ({ list: state.list.filter((m) => !matchesFilter(m, filter)) }));
    return deleted;
  },
}));

function matchesFilter(m: MemoryResponse, filter: ClearMemoryFilter): boolean {
  if (filter.scope !== undefined && m.scope !== filter.scope) return false;
  if (filter.conversationId !== undefined && m.conversationId !== filter.conversationId) return false;
  if (filter.projectId !== undefined && m.projectId !== filter.projectId) return false;
  return true;
}

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
