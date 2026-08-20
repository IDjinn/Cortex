# Cortex — Setup Guide

## Pré-requisitos

- **.NET 10 SDK** (≥ 10.0.201)
- **Bun** (≥ 1.3)
- **Docker Desktop** (para Postgres local)
- **Expo Go** SDK 56 (ou dev build para módulos nativos)

## Backend (Cortex.Core)

```bash
cd C:\dev\csharp\Cortex

# 1. Subir Postgres
docker compose up -d postgres

# 2. Aplicar migration
dotnet ef database update -p Cortex.Core -s Cortex.Core

# 3. Rodar a API em http://localhost:5172
dotnet run --project Cortex.Core --urls http://0.0.0.0:5172
```

> **Para testar no celular**: rode com `--urls http://0.0.0.0:5172` para o backend
> escutar em todas as interfaces, e configure o IP da sua máquina em
> `CodePlus/.env` (`EXPO_PUBLIC_API_BASE_URL=http://192.168.x.y:5172`).

### Configurar OAuth (Google + GitHub)

Coloque client id/secret via user-secrets:

```bash
cd C:\dev\csharp\Cortex\Cortex.Core
dotnet user-secrets init
dotnet user-secrets set "OAuth:Google:ClientId" "..."
dotnet user-secrets set "OAuth:Google:ClientSecret" "..."
dotnet user-secrets set "OAuth:GitHub:ClientId" "..."
dotnet user-secrets set "OAuth:GitHub:ClientSecret" "..."
dotnet user-secrets set "Jwt:SigningKey" "..."  # ≥ 32 chars
```

## Frontend (CodePlus)

```bash
cd C:\dev\react-native\CodePlus

# 1. Instalar deps
bun install

# 2. Configurar .env (veja .env.example)
cp .env.example .env
# edite EXPO_PUBLIC_API_BASE_URL com seu IP

# 3. Iniciar Metro
bunx expo start

# 4. No celular: scanear QR code com Expo Go
```

### Variáveis de ambiente

| Var | Descrição | Default |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | URL do backend (use IP da LAN p/ device físico) | `http://localhost:5172` |
| `EXPO_PUBLIC_OAUTH_REDIRECT` | Scheme de retorno do OAuth (só se aplica em builds nativas; no Expo Go e no web o redirect é derivado em runtime) | `cortex://auth/callback` |

## Verificação rápida

1. `GET http://localhost:5172/health` → `{ "status": "ok" }`
2. App abre na tela de login com logo + botões Google/GitHub.
3. Após OAuth (ou login dev), vê a lista de conversas vazia.
4. Tap em **Nova** → escolhe provider + modelo → entra no chat.
5. Envia uma mensagem → vê o streaming token-a-token.

## Troubleshooting

**`Project is incompatible with this version of Expo Go`**
O Expo Go no device está em SDK mais antiga que o projeto. Atualize o app ou desça o SDK do projeto.

**`Cannot read property 'lg' of undefined` (styled-components)**
O `ThemeProvider` do `styled-components/native` precisa estar no topo. Verifique `app/_layout.tsx`.

**`Unauthorized` em todas as rotas**
JWT expirado ou não configurado. Faça logout/login; se persistir, limpe SecureStore com `expo-secure-store` no Dev Tools.

**Login OAuth (GitHub/Google) trava numa tela branca no IP do backend**
O backend concluiu o OAuth e redirecionou para `cortex://auth/callback`, mas no
Expo Go esse scheme não existe no dispositivo (só `exp://`). O app deriva o
redirect em runtime (`Linking.createURL`) justamente por isso — confira que você
abriu o app pelo MESMO dev server do QR code e que `config.oauthRedirect` resolve
para `exp://<seu-ip>:8081/--/auth/callback`. Em builds nativas (dev build/EAS) o
scheme `cortex` é registrado e o `EXPO_PUBLIC_OAUTH_REDIRECT` do `.env` vale.

**Backend não alcançável do celular**
- Backend precisa escutar em `0.0.0.0` (não só `localhost`)
- Firewall liberar a porta 5172
- Celular e PC na mesma rede Wi-Fi
