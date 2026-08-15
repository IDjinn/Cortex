import { create } from 'zustand';

import type { ToastVariant } from './Toast.styles';

let _idCounter = 0;
function makeId(): string {
  _idCounter += 1;
  return `t_${Date.now().toString(36)}_${_idCounter}`;
}

export interface ToastRecord {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastStore {
  toasts: ToastRecord[];
  show: (input: NewToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export interface NewToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Override the default auto-dismiss duration (ms). */
  duration?: number;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (input) => {
    const id = makeId();
    const record: ToastRecord = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'default',
      duration: input.duration ?? 4000,
    };
    set((state) => ({ toasts: [...state.toasts, record] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/**
 * Imperative API — call from anywhere without hooks:
 *   toast.show({ title: 'Saved' })
 *   toast.success('Done!')
 *   toast.dismiss(id)
 */
export const toast = {
  show: (input: NewToastInput | string) => {
    const payload = typeof input === 'string' ? { title: input } : input;
    return useToastStore.getState().show(payload);
  },
  success: (title: string, description?: string) =>
    useToastStore.getState().show({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().show({ title, description, variant: 'error', duration: 6000 }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().show({ title, description, variant: 'warning' }),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};
