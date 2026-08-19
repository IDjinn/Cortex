import { create } from 'zustand';

import { listModels, listProviders, listVaultKeys } from '@/api';
import type { ChatProviderKind, ModelResponse, ProviderResponse } from '@/api/types';
import { useKeysStore } from './keysStore';
import { useModelPrefsStore } from './modelPrefsStore';
import { localEndpoint } from './localEndpointStore';

/** Display labels for every ChatProviderKind (single source for picker + headers). */
export const PROVIDER_LABEL: Record<ChatProviderKind, string> = {
  OpenRouter: 'OpenRouter',
  Ollama: 'Ollama',
  LmStudio: 'LM Studio',
  OpenAI: 'OpenAI',
  Anthropic: 'Anthropic',
  Gemini: 'Gemini',
  Xai: 'xAI',
  Mistral: 'Mistral',
  DeepSeek: 'DeepSeek',
};

interface ProvidersState {
  catalog: ProviderResponse[];
  /** Models per provider — only for providers the current user can actually use. */
  models: Partial<Record<ChatProviderKind, ModelResponse[]>>;
  hydrated: boolean;
  /** Loads the catalog + model lists. Availability: local always; remote when the
   *  user has a device key, a vault key (authed) or the server has its own key. */
  hydrate: (isGuest: boolean) => Promise<void>;
}

let inflight: Promise<void> | null = null;

/** A provider is usable when a key exists somewhere it can be resolved from. */
function isUsable(p: ProviderResponse, isGuest: boolean, vault: ChatProviderKind[]): boolean {
  if (p.isLocal) return true;
  if (useKeysStore.getState().deviceKeys[p.kind]) return true;
  if (!isGuest && (p.serverKeyConfigured || vault.includes(p.kind))) return true;
  return false;
}

export const useProvidersStore = create<ProvidersState>()((set) => ({
  catalog: [],
  models: {},
  hydrated: false,

  hydrate: async (isGuest: boolean) => {
    inflight ??= (async () => {
      try {
        const [catalog, vaultRaw] = await Promise.all([
          listProviders(),
          isGuest ? Promise.resolve([]) : listVaultKeys().catch(() => []),
        ]);
        const vault = vaultRaw.map((k) => k.provider);
        set({ catalog });

        const usable = catalog.filter((p) => isUsable(p, isGuest, vault));
        const baseUrl = localEndpoint();
        const results = await Promise.all(
          usable.map(async (p) => {
            try {
              const providerKey = useKeysStore.getState().deviceKeys[p.kind];
              const models = await listModels(
                p.kind,
                providerKey
                  ? { providerKey }
                  : p.isLocal && baseUrl
                    ? { baseUrl }
                    : {},
              );
              return [p.kind, models] as const;
            } catch {
              return null;
            }
          }),
        );
        const models: Partial<Record<ChatProviderKind, ModelResponse[]>> = {};
        for (const r of results) if (r && r[1].length > 0) models[r[0]] = r[1];
        set({ models, hydrated: true });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },
}));

/** Default model for new conversations from store data (call hydrate first):
 *  the saved preference when still listed, else the first provider default. */
export function pickDefaultModel(): { provider: ChatProviderKind; model: string } | null {
  const { models } = useProvidersStore.getState();
  const pref = useModelPrefsStore.getState().preferred;
  if (pref && models[pref.provider]?.some((m) => m.id === pref.model)) return pref;
  for (const [provider, list] of Object.entries(models) as [ChatProviderKind, ModelResponse[]][]) {
    const def = list.find((m) => m.isDefault);
    if (def) return { provider, model: def.id };
  }
  const firstEntry = (Object.entries(models) as [ChatProviderKind, ModelResponse[]][])[0];
  return firstEntry ? { provider: firstEntry[0], model: firstEntry[1][0].id } : null;
}
