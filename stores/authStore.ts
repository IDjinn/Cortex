import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { importConversations } from '@/api';
import { tokenStorage } from '@/api/client';
import type { AuthResponse, ImportConversationDto, UserProfile } from '@/api/types';
import { toast } from '@/components/feedback';
import { guestSnapshot, useGuestStore } from './guestStore';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Guest → account migration: imports on-device conversations on login. On
 * failure the guest snapshot is kept so the next login can retry.
 */
async function migrateGuestConversations(): Promise<void> {
  const snapshot = guestSnapshot();
  if (snapshot.conversations.length === 0) return;
  const payload: ImportConversationDto[] = snapshot.conversations.map((c) => ({
    title: c.title,
    provider: c.provider,
    model: c.model,
    pinned: c.pinned,
    messages: (snapshot.messagesByConv[c.id] ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      model: m.model,
      tokensIn: m.tokensIn,
      tokensOut: m.tokensOut,
      error: m.error,
      createdAt: m.createdAt,
      costUsd: m.costUsd,
    })),
  }));
  try {
    const { imported } = await importConversations(payload);
    if (imported > 0) {
      useGuestStore.getState().clear();
      toast.success(`${imported} conversa${imported === 1 ? ' migrada' : 's migradas'}.`);
    }
  } catch {
    toast.warning('Não foi possível migrar suas conversas de convidado.', 'Tentaremos novamente no próximo login.');
  }
}

const GUEST_FLAG_KEY = 'cortex.guest.flag';

interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  /** Set when hydration completes; gates the initial route decision. */
  hydrated: boolean;
  /** True when the user chose to use the app without an account (guest mode). */
  guestMode: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  applyAuth: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
  setError: (err: string | null) => void;
}

export type { AuthState };

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  hydrated: false,
  guestMode: false,
  error: null,

  hydrate: async () => {
    try {
      const [stored, guestFlag] = await Promise.all([
        tokenStorage.get(),
        AsyncStorage.getItem(GUEST_FLAG_KEY),
      ]);
      if (stored && stored.accessToken) {
        // Trust the token; the API layer will refresh or 401 if invalid.
        set({ status: 'authenticated', guestMode: false });
      } else {
        set({ status: 'unauthenticated', guestMode: guestFlag === '1' });
      }
    } catch {
      set({ status: 'unauthenticated' });
    } finally {
      set({ hydrated: true });
    }
  },

  applyAuth: async (auth) => {
    await tokenStorage.set(auth);
    await AsyncStorage.setItem(GUEST_FLAG_KEY, '0');
    set({ status: 'authenticated', user: auth.user, guestMode: false, error: null });
    await migrateGuestConversations();
  },

  signOut: async () => {
    await tokenStorage.clear();
    await AsyncStorage.setItem(GUEST_FLAG_KEY, '0');
    set({ status: 'unauthenticated', user: null, guestMode: false, error: null });
  },

  enterGuestMode: async () => {
    await AsyncStorage.setItem(GUEST_FLAG_KEY, '1');
    set({ status: 'unauthenticated', guestMode: true });
  },

  setError: (err) => set({ error: err }),
}));

/** Selectors. */
export const selectIsAuthed = (s: AuthState) => s.status === 'authenticated';
export const selectNeedsAuth = (s: AuthState) => s.hydrated && s.status !== 'authenticated' && !s.guestMode;
export const selectIsGuest = (s: AuthState) => s.status !== 'authenticated' && s.guestMode;
