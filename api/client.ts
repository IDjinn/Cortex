import * as SecureStore from 'expo-secure-store';

import { config } from '@/config';
import type { ApiError, AuthResponse } from './types';

const KEY_ACCESS = 'cortex.access';
const KEY_REFRESH = 'cortex.refresh';
const KEY_EXPIRES = 'cortex.expires';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

export const tokenStorage = {
  async get(): Promise<StoredAuth | null> {
    const [a, r, e] = await Promise.all([
      SecureStore.getItemAsync(KEY_ACCESS),
      SecureStore.getItemAsync(KEY_REFRESH),
      SecureStore.getItemAsync(KEY_EXPIRES),
    ]);
    if (!a || !r) return null;
    return { accessToken: a, refreshToken: r, expiresAt: Number(e ?? '0') };
  },
  async set(auth: AuthResponse): Promise<void> {
    const expiresAt = new Date(auth.expiresAt).getTime();
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, auth.accessToken),
      SecureStore.setItemAsync(KEY_REFRESH, auth.refreshToken),
      SecureStore.setItemAsync(KEY_EXPIRES, String(expiresAt)),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      SecureStore.deleteItemAsync(KEY_EXPIRES),
    ]);
  },
};

export class ApiError_ extends Error {
  status: number;
  detail?: string | null;
  constructor(payload: ApiError, status: number) {
    super(payload.error);
    this.status = status;
    this.detail = payload.detail;
  }
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthResponse;
    await tokenStorage.set(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** Extra headers (e.g. X-Provider-Key for BYOK requests). */
  headers?: Record<string, string>;
  /** Skip auth header (e.g. for login endpoints). */
  noAuth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = config.apiBaseUrl;
  const url = new URL(path.startsWith('http') ? path : `${base}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...opts.headers,
  };

  if (!opts.noAuth) {
    const stored = await tokenStorage.get();
    if (stored) {
      // Proactive refresh if token expires within 30s.
      if (stored.expiresAt - Date.now() < 30_000) {
        refreshing ??= refreshAccessToken(stored.refreshToken);
        const fresh = await refreshing;
        refreshing = null;
        if (fresh) headers.Authorization = `Bearer ${fresh}`;
        else headers.Authorization = `Bearer ${stored.accessToken}`;
      } else {
        headers.Authorization = `Bearer ${stored.accessToken}`;
      }
    }
  }

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  };

  let res = await fetch(buildUrl(path, opts.query), init);

  if (res.status === 401 && !opts.noAuth) {
    const stored = await tokenStorage.get();
    if (stored?.refreshToken) {
      // Single-flight refresh.
      refreshing ??= refreshAccessToken(stored.refreshToken);
      const fresh = await refreshing;
      refreshing = null;
      if (fresh) {
        const retryInit: RequestInit = { ...init, headers: { ...headers, Authorization: `Bearer ${fresh}` } };
        res = await fetch(buildUrl(path, opts.query), retryInit);
      }
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!res.ok) {
    let payload: ApiError = { error: `HTTP ${res.status}` };
    try {
      if (text) payload = JSON.parse(text) as ApiError;
    } catch {
      payload = { error: `HTTP ${res.status}`, detail: text.slice(0, 500) };
    }
    throw new ApiError_(payload, res.status);
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Returns the current access token (refreshing if needed) — used by the SSE client. */
export async function getAuthHeader(): Promise<string | null> {
  const stored = await tokenStorage.get();
  if (!stored) return null;
  if (stored.expiresAt - Date.now() < 30_000) {
    refreshing ??= refreshAccessToken(stored.refreshToken);
    const fresh = await refreshing;
    refreshing = null;
    return fresh ?? stored.accessToken;
  }
  return stored.accessToken;
}

export { ApiError_ as ApiError };
