import { apiRequest } from './client';
import { config } from '@/config';
import type {
  ConversationDetailResponse,
  ConversationResponse,
  ModelResponse,
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
  provider: 'OpenRouter' | 'Ollama';
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
  patch: { title?: string; pinned?: boolean },
): Promise<ConversationResponse> {
  return apiRequest<ConversationResponse>(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteConversation(id: string): Promise<void> {
  return apiRequest<void>(`/api/conversations/${id}`, { method: 'DELETE' });
}

// ---- Models ----

export function listModels(provider: 'OpenRouter' | 'Ollama', refresh = false): Promise<ModelResponse[]> {
  return apiRequest<ModelResponse[]>('/api/models', { query: { provider, refresh } });
}
