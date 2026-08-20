import { create } from 'zustand';

import {
  createProject as apiCreate,
  deleteProject as apiDelete,
  listProjects,
  renameProject as apiRename,
  type CreateProjectInput,
} from '@/api';
import type { ProjectResponse } from '@/api/types';

export interface ProjectNode {
  /** Root project. */
  project: ProjectResponse;
  /** Folders of the root (2 levels; folders never nest). */
  folders: ProjectResponse[];
  /** Conversations filed directly in the root (not in any folder). */
  directCount: number;
  /** directCount + every folder's count — the sidebar badge. */
  totalCount: number;
}

interface ProjectsState {
  list: ProjectResponse[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  create: (input: CreateProjectInput) => Promise<ProjectResponse>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export type { ProjectsState };

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  list: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const data = await listProjects();
      data.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      set({ list: data, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  create: async (input) => {
    const created = await apiCreate(input);
    set((state) => ({
      list: [...state.list, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }));
    return created;
  },

  rename: async (id, name) => {
    await apiRename(id, name);
    set((state) => ({
      list: state.list
        .map((p) => (p.id === id ? { ...p, name: name.trim() } : p))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }));
  },

  remove: async (id) => {
    await apiDelete(id);
    // A deleted root takes its folders along (server cascade).
    set((state) => ({ list: state.list.filter((p) => p.id !== id && p.parentId !== id) }));
  },
}));

/** Builds the 2-level tree (roots with their folders) from the flat list. */
export function buildProjectTree(list: ProjectResponse[]): ProjectNode[] {
  const foldersByParent = new Map<string, ProjectResponse[]>();
  for (const p of list) {
    if (p.parentId === null) continue;
    const bucket = foldersByParent.get(p.parentId);
    if (bucket) bucket.push(p);
    else foldersByParent.set(p.parentId, [p]);
  }
  return list
    .filter((p) => p.parentId === null)
    .map((project) => {
      const folders = foldersByParent.get(project.id) ?? [];
      const directCount = project.conversationCount;
      const totalCount = directCount + folders.reduce((sum, f) => sum + f.conversationCount, 0);
      return { project, folders, directCount, totalCount };
    });
}
