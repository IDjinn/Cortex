import { apiRequest } from './client';
import { config } from '@/config';
import type {
  ChatProviderKind,
  ConversationDetailResponse,
  ConversationResponse,
  ImportConversationDto,
  ImportMemoryDto,
  ImportResultResponse,
  MemoryResponse,
  MemoryScope,
  ModelResponse,
  ProviderKeyResponse,
  ProviderResponse,
  UsageResponse,
  UserProfile,
} from './types';

// ---- Auth ----

export interface OAuthLoginUrlResult {
  url: string;
}

export function buildOAuthLoginUrl(provider: 'google' | 'github'): OAuthLoginUrlResult {
  return {
    url: `${config.apiBaseUrl}/api/auth/${provider}/login?redirectUri=${encodeURIComponent(config.oauthRedirect)}`,
  };
}

// ---- Profile / Me ----

export function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/me');
}

// ---- Conversations ----

export interface CreateConversationInput {
  title?: string;
  provider: ChatProviderKind;
  model: string;
}

export function listConversations(): Promise<ConversationResponse[]> {
  return apiRequest<ConversationResponse[]>('/api/conversations');
}

export function createConversation(input: CreateConversationInput): Promise<ConversationDetailResponse> {
  return apiRequest<ConversationDetailResponse>('/api/conversations', {
    method: 'POST',
    body: input,
  });
}

export function getConversation(id: string): Promise<ConversationDetailResponse> {
  return apiRequest<ConversationDetailResponse>(`/api/conversations/${id}`);
}

export function updateConversation(
  id: string,
  patch: {
    title?: string;
    pinned?: boolean;
    provider?: ChatProviderKind;
    model?: string;
    /** Empty string clears the fallback. */
    fallbackProvider?: string;
    fallbackModel?: string;
  },
): Promise<void> {
  return apiRequest<void>(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteConversation(id: string): Promise<void> {
  return apiRequest<void>(`/api/conversations/${id}`, { method: 'DELETE' });
}

// ---- Guest → account migration ----

export function importConversations(
  conversations: ImportConversationDto[],
  memories?: ImportMemoryDto[],
): Promise<ImportResultResponse> {
  return apiRequest<ImportResultResponse>('/api/conversations/import', {
    method: 'POST',
    body: { conversations, memories },
  });
}

// ---- Usage & cost ----

/** Monthly usage per provider; month = "yyyy-MM" (defaults to current). */
export function getUsage(month?: string): Promise<UsageResponse[]> {
  return apiRequest<UsageResponse[]>('/api/usage', { query: { month } });
}

// ---- Providers ----

export function listProviders(): Promise<ProviderResponse[]> {
  return apiRequest<ProviderResponse[]>('/api/providers');
}

// ---- BYOK vault (server-side, encrypted at rest) ----

export function listVaultKeys(): Promise<ProviderKeyResponse[]> {
  return apiRequest<ProviderKeyResponse[]>('/api/keys');
}

export function saveVaultKey(provider: ChatProviderKind, key: string): Promise<void> {
  return apiRequest<void>(`/api/keys/${provider}`, { method: 'PUT', body: { key } });
}

export function removeVaultKey(provider: ChatProviderKind): Promise<void> {
  return apiRequest<void>(`/api/keys/${provider}`, { method: 'DELETE' });
}

// ---- Memories ----

export function listMemories(scope?: MemoryScope, conversationId?: string): Promise<MemoryResponse[]> {
  return apiRequest<MemoryResponse[]>('/api/memories', {
    query: { scope, conversationId },
  });
}

export function createMemory(input: {
  scope: MemoryScope;
  conversationId?: string;
  content: string;
}): Promise<MemoryResponse> {
  return apiRequest<MemoryResponse>('/api/memories', { method: 'POST', body: input });
}

export function updateMemory(id: string, content: string): Promise<void> {
  return apiRequest<void>(`/api/memories/${id}`, { method: 'PATCH', body: { content } });
}

export function deleteMemory(id: string): Promise<void> {
  return apiRequest<void>(`/api/memories/${id}`, { method: 'DELETE' });
}

// ---- Models ----

export interface ListModelsOptions {
  refresh?: boolean;
  /** BYOK key proxied per request (header) — bypasses the server cache. */
  providerKey?: string;
  /** Custom local endpoint (LM Studio / llama.cpp on another host); local providers only. */
  baseUrl?: string;
}

export function listModels(provider: ChatProviderKind, options: ListModelsOptions | boolean = {}): Promise<ModelResponse[]> {
  // `boolean` kept for the old `refresh` positional signature.
  const opts = typeof options === 'boolean' ? { refresh: options } : options;
  const query: Record<string, string | boolean> = { provider };
  if (opts.refresh) query.refresh = true;
  if (opts.baseUrl) query.baseUrl = opts.baseUrl;
  return apiRequest<ModelResponse[]>('/api/models', {
    query,
    headers: opts.providerKey ? { 'X-Provider-Key': opts.providerKey } : undefined,
  });
}
