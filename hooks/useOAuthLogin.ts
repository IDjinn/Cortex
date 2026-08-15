import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';

import { buildOAuthLoginUrl } from '@/api';
import { config } from '@/config';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/feedback';
import type { AuthResponse } from '@/api';

export type OAuthProvider = 'google' | 'github';

/**
 * Opens the OAuth flow for a given provider in an in-app browser (native)
 * or a new tab (web). The backend finishes the exchange and 302's back to
 * the app's custom-scheme redirect with the tokens; here we parse that URL
 * and persist the session via the auth store.
 */
export function useOAuthLogin() {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const applyAuth = useAuthStore((s) => s.applyAuth);

  const login = useCallback(async (provider: OAuthProvider) => {
    setPending(provider);
    try {
      const { url } = buildOAuthLoginUrl(provider);
      if (Platform.OS === 'web') {
        Linking.openURL(url);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(url, config.oauthRedirect);
      if (result.type === 'cancel') {
        return; // user closed the browser, no toast needed
      }
      if (result.type !== 'success' || !('url' in result)) {
        return;
      }
      const auth = parseCallbackPayload(result.url);
      if (!auth) {
        toast.error('Login falhou', 'Resposta de autenticação inválida');
        return;
      }
      await applyAuth(auth);
    } catch (err) {
      toast.error('Não foi possível iniciar o login', String(err));
    } finally {
      setPending(null);
    }
  }, [applyAuth]);

  return { login, pending };
}

/**
 * Extracts the `data` query param (a URL-encoded JSON AuthResponse) from the
 * custom-scheme redirect URL the backend bounces us to.
 */
function parseCallbackUrl(url: string): URLSearchParams | null {
  const qIndex = url.indexOf('?');
  if (qIndex < 0) return null;
  return new URLSearchParams(url.slice(qIndex + 1));
}

function parseCallbackPayload(url: string): AuthResponse | null {
  const params = parseCallbackUrl(url);
  const raw = params?.get('data');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}
