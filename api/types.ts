/**
 * API types — mirror Cortex.Core DTOs (see Cortex.Core/Dtos/Dtos.cs).
 * Backend serializes enums as camelCase strings (JsonStringEnumConverter).
 */

export type AuthProvider = 'Google' | 'GitHub';
export type ChatProviderKind =
  | 'OpenRouter'
  | 'Ollama'
  | 'LmStudio'
  | 'OpenAI'
  | 'Anthropic'
  | 'Gemini'
  | 'Xai'
  | 'Mistral'
  | 'DeepSeek';
export type MessageRole = 'User' | 'Assistant' | 'System' | 'Tool';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  user: UserProfile;
}

export interface ConversationResponse {
  id: string;
  title: string;
  provider: ChatProviderKind;
  model: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface MessageResponse {
  id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  error: string | null;
  createdAt: string;
}

export interface ConversationDetailResponse extends Omit<ConversationResponse, 'messageCount'> {
  messages: MessageResponse[];
}

export interface ModelResponse {
  id: string;
  name: string;
  description: string | null;
  contextLength: number | null;
  promptPrice: number | null;
  completionPrice: number | null;
  /** True on the provider's configured default model (Providers:{Provider}:DefaultModel). */
  isDefault: boolean;
  supportsTools: boolean | null;
  supportsVision: boolean | null;
}

/** Provider catalog entry (GET /api/providers) — availability for picker and settings. */
export interface ProviderResponse {
  kind: ChatProviderKind;
  name: string;
  isLocal: boolean;
  requiresKey: boolean;
  serverKeyConfigured: boolean;
}

export interface ApiError {
  error: string;
  detail?: string | null;
}

// ---- SSE streaming events ----
// Both endpoints (POST /api/chat authed, POST /api/chat/anonymous guest)
// emit `event: <type>\ndata: <json>\n\n` frames. The discriminator lives in
// the SSE `event:` header (not in the JSON), and the payloads carry raw
// fields — never a full MessageResponse nor a `type` field.

export type ChatTurnEvent =
  | { type: 'token'; text: string }
  | { type: 'toolCall'; id: string; name: string; arguments: string }
  | { type: 'usage'; tokensIn: number; tokensOut: number }
  | { type: 'completed'; tokensIn: number | null; tokensOut: number | null }
  | { type: 'failed'; reason: string };

/** Minimal message shape sent to the anonymous chat endpoint (stateless). */
export interface AnonymousChatMessage {
  role: MessageRole;
  content: string;
}
