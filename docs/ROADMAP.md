# Cortex — Roadmap & Backlog

> Single source of truth for product direction and tasks. Check items off as they ship. New work gets added here first — if a feature doesn't trace back to a task in this file, add the task before building it.

## Vision

Cortex is a **complete AI environment** — the hub for all your AI context: chat, agents, skills, memories, and indexed code. It runs in two complementary modes:

- **Main agent** — Cortex does the work itself: multi-step tasks, tool use, automations.
- **Helper** — Cortex makes other agents (Claude Code, Cursor, Codex, …) better by feeding them context: memories, indexed repositories, skills.

Mobile today, desktop next. Offline-first, secure, and anonymous by default. Compatible with the major AI players through aggregation (OpenRouter) and direct connectors.

### Product pillars

1. **Multi-provider connectors** — aggregation (OpenRouter) plus direct connectors: OpenAI, Anthropic, Google, xAI, Mistral, DeepSeek, local Ollama / LM Studio. BYOK (bring your own key).
2. **Context engine** — persistent memories, code indexing with RAG retrieval, skills manager.
3. **Agent-first** — tool calling, orchestration, helper mode, automations, A2A (agent-to-agent).
4. **Multiplatform** — mobile (Expo) today; desktop companion sharing the same core.
5. **Privacy & security** — anonymous use, no tracking, keys stay on device by default, E2E encryption for cloud sync.
6. **Tiers** — **Offline**: free for non-commercial use (PolyForm NC, see [LICENSE](../LICENSE)). **Cloud**: monthly subscription.

### Status

| Phase | Focus | Status |
| ----- | ------------------------------------------ | ----------- |
| 1 | Chat MVP | ✅ shipped |
| 2 | Provider layer | ✅ shipped |
| 3 | Context engine (memories, skills, indexing, MCP) | ◀ next up |
| 4 | Agent mode (tools, automations, A2A) | planned |
| 5 | Desktop + Cloud (sync, subscription) | planned |

Dependency chain: Phase 3 relies on Phase 2's capability metadata; Phase 4's tool loop relies on connectors that support tool calling; Phase 5's sync relies on Phase 3's entities being defined.

---

## Phase 1 — Chat MVP ✅

Shipped: OAuth (Google + GitHub) with JWT refresh; anonymous guest mode with on-device conversations (Ollama-only); conversation CRUD (create / rename / pin / delete); SSE streaming chat; markdown rendering; gray-first theme.

## Phase 2 — Provider layer ✅

Shipped: model picker with search/context/price/capabilities (full OpenRouter catalog) and per-conversation switching; direct connectors (OpenAI, Anthropic, Gemini, xAI, Mistral, DeepSeek) with normalized streaming + tool-call contract behind the internal SSE events; capability metadata via `/api/models` and `/api/providers`; BYOK (device SecureStore keys proxied per request + encrypted server-side vault for accounts, resolved header > vault > server key); per-conversation and monthly cost accounting (`/api/usage`); manual routing fallback (tries the reserve provider when the primary fails before the first token); guest mode expanded to any local endpoint (custom `baseUrl` for LM Studio/llama.cpp/Ollama) and remote providers with the guest's own key; automatic guest → account migration on login.

> Automatic cost/latency routing was descoped to Phase 4/5 — Phase 2 ships the manual per-conversation fallback only.

**Epic: Model selection**

- [x] Model picker UI: provider × model, showing context window and price, with a persisted default per user and per conversation

**Epic: Direct connectors (backend `IProvider` implementations)**

- [x] OpenAI connector
- [x] Anthropic connector
- [x] Google Gemini connector
- [x] xAI connector
- [x] Mistral connector
- [x] DeepSeek connector
- [x] Normalize streaming and tool-call formats behind the internal SSE contract
- [x] Capability metadata per model (tools, vision, context length) exposed via `/api/models`

**Epic: BYOK key vault**

- [x] On-device key storage (expo-secure-store); keys proxied per request and never persisted server-side for offline/guest use
- [x] Optional server-side vault (encrypted at rest) for cloud accounts

**Epic: Routing & cost**

- [x] Provider routing with fallback (availability, cost, latency) — manual fallback per conversation; automatic routing moved to Phase 4/5
- [x] Token usage & cost accounting per conversation and per month

**Epic: Guest mode expansion**

- [x] Guest mode beyond Ollama: any local endpoint (LM Studio, llama.cpp) and user-supplied remote keys
- [x] Guest → account migration on login (use the prepared `guestSnapshot()`)

**Epic: Reasoning transparency**

- [x] Chain-of-thought streaming: every connector normalizes reasoning deltas (OpenRouter/xAI `reasoning`, DeepSeek/llama.cpp `reasoning_content`, Anthropic `thinking_delta`, Gemini thought parts, Ollama `thinking`) into a `reasoning` SSE event
- [x] Reasoning persisted per message (accounts) / on-device (guests) and shown in a collapsible block in the bubble — live while the model thinks ("Pensando…"), collapsed once the answer starts

**Epic: Chat UX polish**

- [x] Animated "…" typing dots while the model generates
- [x] Per-message generation stats (tok/s + duration), opt-in via Ajustes → Conversa
- [x] Default response language setting (Ajustes → Conversa; "auto" follows the device locale)
- [x] Frictionless conversation switching: in-place swap without entry stagger or loading flash; switching a conversation's model also becomes the default for new chats
- [x] Bottom sheets paint behind the Android navigation bar (translucent modal window)
- [x] Code blocks with syntax highlight and a copy button — generic `CodeBlock` component (dependency-free scanner), wired into the markdown renderer
- [x] Stable bubble layout: assistant bubbles hold a fixed width (opening the reasoning block no longer resizes them) and user text no longer wraps one character per line
- [x] Stream-following scroll: the list follows new tokens while at the bottom, pauses when the user scrolls up and offers a jump-to-bottom button
- [x] Compact "…" typing bubble (hugs the dots instead of the full answer width)
- [x] Auto-title: the first message replaces "Nova conversa" with a derived title (client-side; LLM-generated titles are future work)
- [x] Account section in Ajustes: profile name/avatar rehydrated from `/api/me`, guest "Vincular conta" (Google/GitHub OAuth) and sign out
- [x] Usage & stats: 6-month token chart + per-provider split (authed, from `/api/usage`), local stats card (conversations, messages, memories, tokens) for guests

## Phase 3 — Context engine (in progress)

**Epic: Memories** ✅ (shipped)

- [x] Data model with scopes: global / project / conversation — `Project` scope is reserved in the enum until the Project entity exists; UI exposes Global + Conversation
- [x] CRUD UI plus automatic memory extraction (assistant proposes memories; user confirms) — extraction runs server-side post-turn on the conversation's model and arrives as an SSE `memoryProposal` event; guest mode has manual memories only (extraction client-side is future work)
- [x] Prompt injection with a relevance budget (top-k memories per turn) — deterministic top-K/char budget today (newest first); semantic ranking lands with the embeddings epic

**Epic: Skills manager**

- [ ] Skills in the open agent-skills `SKILL.md` format (import/export compatibility)
- [ ] Create / edit / version skills; enable per conversation
- [ ] Curated skill directory (bundled + community) — later

**Epic: Code indexing**

- [ ] Repository sources: local folders (desktop), GitHub / GitLab remotes
- [ ] Chunking + embeddings pipeline with provider-agnostic embedding connectors
- [ ] Vector store: pgvector (cloud) and a local store (offline)
- [ ] Incremental re-indexing on change
- [ ] RAG retrieval wired into chat, citing indexed files

**Epic: MCP client**

- [ ] Connect to external MCP servers (remote HTTP/SSE now; stdio once desktop lands)
- [ ] Surface MCP tools/resources in chat and the agent loop
- [ ] MCP server management UI (add / remove / enable per conversation)

## Phase 4 — Agent mode

**Epic: Tool use**

- [ ] Provider-agnostic function/tool-calling loop (parallel calls, error handling, user approval for sensitive tools)

**Epic: Main agent**

- [ ] Multi-step orchestration: plans, sub-tasks, pause/resume
- [ ] Sandboxed tools: web search, fetch, code execution (desktop)

**Epic: Helper mode**

- [ ] Expose Cortex context (memories, index, skills) to external agents through a built-in MCP server
- [ ] Pairing/handshake with agent CLIs (Claude Code, Cursor, …)

**Epic: Automations**

- [ ] Scheduled agent runs (cron-like)
- [ ] Webhook / event triggers
- [ ] Pipelines (agent + tools + trigger) with run history and notifications

**Epic: A2A (agent-to-agent)**

- [ ] Agent cards advertising capabilities
- [ ] Task delegation to/from remote agents over the A2A protocol

## Phase 5 — Desktop + Cloud

**Epic: Desktop**

- [ ] Spike: Tauri vs Electron (criteria: stdio MCP support, filesystem access for indexing, bundle size, auto-update)
- [ ] Desktop app sharing the core (providers, context engine) with mobile

**Epic: Cloud & sync**

- [ ] Local-first sync across devices with conflict resolution
- [ ] E2E-encrypted sync (server cannot read content)
- [ ] Anonymous cloud accounts (no email required; device/passkey identity)

**Epic: Monetization**

- [ ] Billing spike: RevenueCat vs Paddle vs Stripe (mobile in-app purchase rules vs web)
- [ ] Subscription tiers and feature gating (offline stays free for non-commercial use)
- [ ] Cloud terms of service + privacy policy drafts

---

## Cross-cutting (always active)

**Security & anonymity principles (non-negotiable)**

- No telemetry or tracking by default.
- Guest/anonymous mode never uploads content to the server.
- API keys are stored on device (SecureStore) unless the user explicitly opts into the cloud vault.
- Cloud sync is end-to-end encrypted; the server stores ciphertext only.

**Licensing**

- App (offline tier): PolyForm Noncommercial 1.0.0 — free for non-commercial use; commercial use requires a separate license.
- Cloud service: runs under its own subscription terms (task in Phase 5).

**Compatibility matrix**

Keep a provider × capability table (chat streaming, tool calling, vision, embeddings) up to date in the docs as connectors land.
