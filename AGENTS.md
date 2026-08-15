# Cortex (CodePlus) — AGENTS.md

> Internal project name: **Cortex**. Folder is still `CodePlus/` due to path-migration.

## Stack

- **Mobile**: Expo SDK **56** (NOT 57), React 19, RN 0.85.3, expo-router (typed routes), styled-components/native 6, Reanimated 4.3.1, gesture-handler 2.31, expo-secure-store, react-native-markdown-display, Zustand 5, Bun 1.3.
- **Backend**: `C:\dev\csharp\Cortex` — .NET 10 (SDK 10.0.201 via `global.json`), EF Core 10, Npgsql 10, JWT, Postgres 17 via Docker.

## Commands

```bash
# Typecheck (no separate linter configured; tsc covers it)
bunx tsc --noEmit

# Metro dev server
bunx expo start

# Clear caches (LSP/Metro often go stale after renaming files in app/)
Remove-Item .expo -Recurse -Force -ErrorAction SilentlyContinue
```

## Conventions

- **`.styles.ts` files NEVER in `app/`**: in SDK 56 the `_` prefix no longer excludes files from routing (`node_modules/expo-router/_ctx.js` collects all `.ts/.tsx`). Put screen styles in `components/screens/` (e.g. `components/screens/tabs.styles.ts`) and import them via `@/components/screens/...`.
- **Typed routing**: when a route doesn't exist as a file yet, cast it: `(router as { push: (p: string) => void }).push('/foo')`.
- **styled-components native** requires the `<ThemeProvider>` from `styled-components/native` at the root — already in `theme/ThemeProvider.tsx`. Without it, `theme.spacing.lg` etc. will be `undefined`.
- **Easing**: never use pure `ease-in` in UI. Use the tokens from `theme/motion.ts` (`decelerate`, `standard`, `drawer`).
- **Animations**: buttons use `scale(0.97)` on press via Reanimated (not RN's Animated). Bubbles enter with a 45ms stagger, never `scale(0)`.
- **No commented-out code** unless explicitly requested.
- **Auth gate**: `app/_layout.tsx` decides between `/login` and `(tabs)` based on `useAuthStore`. Do not add auth logic inside screens.
- **JWT tokens**: in `expo-secure-store`, keys `cortex.access` / `cortex.refresh` / `cortex.expires`. `api/client.ts` does single-flight refresh on 401 and proactively 30s before expiry.

## Structure

- `app/` — expo-router routes (typed)
- `api/` — HTTP client, SSE, typed endpoints (mirror of backend DTOs)
- `components/ui/` — Button, IconButton, Card, Input, Avatar, Divider
- `components/screens/` — screen styles (outside `app/` so they don't become routes)
- `components/chat/` — Bubble (User/Assistant) with staggered entrance
- `components/sheets/` — BottomSheet with Pan gesture + velocity-based dismiss
- `components/feedback/` — Toaster (Sonner-style) + toast() API
- `components/markdown/` — MarkdownView for LLM output
- `stores/` — Zustand: authStore, conversationsStore
- `theme/` — colors, spacing, typography, motion, shadows, ThemeProvider
- `config/` — reads `EXPO_PUBLIC_*` env with fallback to app.json extra

## Backend (mirror)

The DTOs in `api/types.ts` mirror `Cortex.Core/Dtos/Dtos.cs`. If the backend changes, update the mirror. The backend serializes enums as strings (camelCase via `JsonStringEnumConverter`).

## Environment variables (.env)

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.15.4:5172
EXPO_PUBLIC_OAUTH_REDIRECT=cortex://auth/callback
```

## LSP status

When files are renamed, the LSP cache goes stale and shows errors for files that no longer exist. **Always confirm with `bunx tsc --noEmit`** — if it passes, ignore the LSP errors.

## Docs

- `README.md` — overview + Mermaid diagram of the architecture
- `docs/SETUP.md` — step-by-step backend + frontend + troubleshooting
- `docs/openapi.yaml` — OpenAPI 3 spec of the backend
