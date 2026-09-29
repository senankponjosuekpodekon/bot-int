# Bot-Int — AI Agent Platform

A multi-tenant SaaS platform to deploy, manage, and integrate AI agents (powered by Ollama LLMs) into any business workflow.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Roadmap](#roadmap)

---

## Overview

Bot-Int lets businesses create AI agents with custom personalities and knowledge bases, deploy them on multiple channels (web chat, API), capture leads, and track conversations — all within a multi-tenant architecture where each company's data is fully isolated.

**Core capabilities:**
- Multi-tenant authentication (JWT, bcrypt)
- AI agent creation with system prompts and persona config
- Real-time chat powered by local Ollama LLMs (llama3.2, mistral, etc.)
- Knowledge base management (text ingestion, search)
- Lead capture and CRM pipeline from chat conversations
- Full REST API for third-party integrations

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Next.js Frontend           │
│  Dashboard · Chat · Agents · Leads      │
│           localhost:3000                │
└──────────────────┬──────────────────────┘
                   │ HTTP / REST
┌──────────────────▼──────────────────────┐
│            NestJS API (REST)            │
│  Auth · Tenants · Agents · Chat         │
│  Knowledge · Leads                      │
│           localhost:3001/api            │
└──────┬───────────────────────┬──────────┘
       │                       │
┌──────▼──────┐       ┌────────▼────────┐
│ PostgreSQL  │       │  Ollama (LLM)   │
│  :5432      │       │  :11434         │
└─────────────┘       └─────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Backend | NestJS 11, TypeORM 0.3, Passport JWT |
| Database | PostgreSQL 16 + pgvector (Neon-compatible via `DATABASE_URL`) |
| Cache / Queue | Redis (ioredis) + internal job table (`FOR UPDATE SKIP LOCKED`) |
| AI / LLM | Fallback provider: OpenAI-compatible (Groq…) → Ollama, Jina embeddings |
| Realtime | Socket.IO (authenticated) + SSE |
| Frontend | Next.js 16, React 19, Tailwind CSS, next-intl |
| State | Zustand |
| HTTP Client | Axios |
| Auth | JWT (Bearer) + refresh-token rotation (bcrypt-hashed) |
| Payments | Stripe (+ pluggable providers via `payment-sdk`) |
| Containerization | Docker + Docker Compose + nginx |

---

## Project Structure

```
bot_int/
├── apps/
│   ├── api/                        # NestJS backend (~25 modules)
│   │   ├── src/
│   │   │   ├── main.ts             # Bootstrap (rawBody, trust proxy, health)
│   │   │   ├── app.module.ts
│   │   │   ├── common/             # crypto, cache, SSRF guard, exception filter
│   │   │   ├── migrations/         # TypeORM migrations (run in prod on boot)
│   │   │   └── modules/
│   │   │       ├── auth/           # JWT, refresh rotation, sessions
│   │   │       ├── tenants/        # Multi-tenant management
│   │   │       ├── agents/         # AI agent CRUD
│   │   │       ├── chat/           # Conversations, LLM, SSE, Socket.IO gateway
│   │   │       ├── widget/         # Public embeddable widget (embed.js)
│   │   │       ├── channels/       # WhatsApp / Instagram inbound webhooks
│   │   │       ├── billing/        # Plans, quotas, Stripe webhooks
│   │   │       ├── integrations/   # External commerce/messaging integrations
│   │   │       ├── webhooks/       # Outbound webhooks (HMAC-signed, queued)
│   │   │       ├── queue/          # DB-backed job queue + processors
│   │   │       ├── knowledge/      # Documents, chunks, vector search, scraping
│   │   │       ├── leads/          # Lead capture & CRM
│   │   │       └── …               # products, flows, surveys, admin, site…
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                        # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/         # Login & Register pages
│       │   │   └── dashboard/      # Protected dashboard
│       │   │       ├── page.tsx    # Overview stats
│       │   │       ├── agents/     # Agent management
│       │   │       ├── chat/       # Live chat testing
│       │   │       ├── leads/      # Lead pipeline
│       │   │       └── knowledge/  # Knowledge base
│       │   ├── components/
│       │   │   └── Sidebar.tsx
│       │   ├── lib/
│       │   │   └── api.ts          # Axios API client
│       │   └── store/
│       │       └── auth.store.ts   # Zustand auth state
│       ├── Dockerfile
│       └── package.json
├── docker-compose.yml
├── turbo.json
├── package.json
└── tsconfig.base.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 20 (recommended: v22/v24 via nvm)
- PostgreSQL 16 with pgvector — local, Docker, or managed (e.g. Neon via `DATABASE_URL`)
- [Ollama](https://ollama.ai) installed and running (or an OpenAI-compatible API key)

### 1. Clone the repository

```bash
git clone git@github.com:senankponjosuekpodekon/bot-int.git
cd bot-int
```

### 2. Install dependencies

```bash
nvm use 24
npm install
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your database credentials and JWT secret.

### 4. Setup the database

```bash
# If using local PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE stiamond_agent;"
sudo -u postgres psql -c "CREATE USER stiamond WITH PASSWORD 'stiamond123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE stiamond_agent TO stiamond;"
sudo -u postgres psql -d stiamond_agent -c "GRANT ALL ON SCHEMA public TO stiamond;"
```

### 5. Run database migrations

From the repo root, run the pending TypeORM migrations (the CLI automatically loads `apps/api/.env`).

```bash
npm run migration:run -w apps/api
```

### 6. Start Ollama and pull a model

```bash
ollama serve
ollama pull llama3.2
```

### 7. Run the project

```bash
npm run dev
```

This starts both API (`http://localhost:3001/api`) and Web (`http://localhost:3000`) in parallel via Turborepo.

---

## Environment Variables

Copy `.env.example` → `.env` at the repo root (the API loads it). Key variables:

```env
# Database — prefer a single URL in production (Neon, RDS, …)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
# …or individual vars for local dev:
# DB_HOST=localhost  DB_PORT=5432  DB_USER=stiamond  DB_PASSWORD=…  DB_NAME=stiamond_agent

# Required in production — app refuses to boot without them
JWT_SECRET=your_very_long_random_secret_here
ENCRYPTION_KEY=exactly-32-char-secret-for-aes256-gcm

JWT_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_MINUTES=10080  # 7 days

# Security / runtime
NODE_ENV=production
TRUST_PROXY=1                    # hops to trust for client IP (rate-limit)
CORS_ORIGINS=https://your-app.com
ENABLE_DEBUG_PAGES=false         # /api/admin, /api/operator, /api/widget-demo pages

# LLM
LLM_PROVIDER=openai              # falls back to Ollama
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OLLAMA_URL=https://ollama.example.com
OLLAMA_MODEL=llama3.1:latest
OLLAMA_CF_ACCESS_CLIENT_ID=      # Cloudflare Access service token (if used)
OLLAMA_CF_ACCESS_CLIENT_SECRET=

# Billing (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=           # required for webhook signature verification
STRIPE_PRICE_STARTER=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_SCALE=
BILLING_BYPASS_QUOTA=false       # never true in production

# Channel webhooks (inbound signature verification — fail closed if unset)
WHATSAPP_WEBHOOK_SECRET=
INSTAGRAM_WEBHOOK_SECRET=

# Redis (cache, rate-limit storage)
REDIS_URL=redis://localhost:6379

# Queue — poll interval backs off exponentially to the max when idle
QUEUE_BATCH_SIZE=5
QUEUE_POLL_INTERVAL_MS=5000
QUEUE_POLL_MAX_INTERVAL_MS=60000

# Frontend
NEXT_PUBLIC_API_URL=https://api.your-app.com/api
```

> **Secrets**: never commit `.env` or `pgbouncer/userlist.txt` (gitignored; generated from `DB_USER`/`DB_PASSWORD` at container start).

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create tenant + admin user |
| POST | `/api/auth/login` | Issue access + refresh tokens |
| POST | `/api/auth/refresh` | Rotate refresh token, mint new JWT |
| POST | `/api/auth/logout` | Revoke an active refresh token |

#### Token lifecycle

1. **Login/Register** returns `{ access_token, refresh_token, userId, tenantId }`.
2. **Access token** (JWT) expires quickly (15 min by default) and is sent via `Authorization: Bearer`.
3. **Refresh token** combines a public `tokenId` and secret (`tokenId.secret`). Store it securely (frontend keeps it in localStorage for now) and send it in the `refresh`/`logout` body as `{ refreshToken }`.
4. Calling `/auth/refresh` verifies + revokes the previous token, then returns fresh credentials. Always replace both tokens client-side.
5. `/auth/logout` simply revokes the provided refresh token so it can no longer mint JWTs.

### Agents

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/agents` | List agents for tenant |
| POST | `/api/agents` | Create new agent |
| GET | `/api/agents/:id` | Get agent details |
| PATCH | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/send` | Send message to agent |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/history/:id` | Get conversation history |
| PATCH | `/api/chat/:id/lead` | Attach a conversation to an existing lead |
| PATCH | `/api/chat/:id/status` | Update the status of a conversation (open/closed) |

`GET /api/chat/conversations` accepts optional query params for pagination and filters:

- `page` (default `1`) & `limit` (default `20`, max `100`)
- `agentId` (UUID), `status` (`open`\|`closed`), `channel` (`web`\|`whatsapp`\|`api`)
- `hasLead` (`true`/`false`) and `leadStatus` (`new`\|`contacted`\|`qualified`\|`converted`\|`lost`)


### Knowledge

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/knowledge/text` | Add text document |
| GET | `/api/knowledge` | List documents |
| GET | `/api/knowledge/search?q=` | Search documents |
| DELETE | `/api/knowledge/:id` | Delete document |

### Leads

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leads` | List leads |
| POST | `/api/leads` | Create lead |
| GET | `/api/leads/:id` | Get lead |
| PATCH | `/api/leads/:id` | Update lead status |

---

## Testing & Quality

```bash
# API
npm run lint -w apps/api        # ESLint
npm run build -w apps/api       # TypeScript compile
npm test -w apps/api            # Jest unit tests

# Web
npm run build -w apps/web       # Next.js production build
npm run test:e2e -w apps/web    # Playwright (login, widget, agent-to-lead)
```

## Security Notes

- **Multi-tenancy**: every query is scoped by `tenantId` at the service layer; public widget access is bound to a `visitorId`.
- **Auth**: JWT in `Authorization: Bearer` header only (query-string tokens rejected); refresh tokens are hashed (bcrypt), rotated atomically, and revocable per-session.
- **Secrets at rest**: integration credentials are AES-256-GCM encrypted (`enc:v1:` ciphertext) via `ENCRYPTION_KEY` and masked in API responses.
- **Inbound webhooks**: HMAC verified against the raw request body — missing secrets fail closed.
- **Outbound webhooks**: delivered via the job queue (retries) and signed `t=<ts>,v1=<hmac>` in `X-Webhook-Signature`.
- **SSRF**: all user-supplied fetch URLs (webhooks, product imports, URL scraping) are validated against private/internal addresses (`common/ssrf-guard.ts`).
- **Rate limiting**: app-level `@nestjs/throttler` (strict on `/api/auth/*`) + nginx `limit_req` zones; client IP relies on `TRUST_PROXY`.
- **Schema**: TypeORM `synchronize` is disabled in production — schema changes go through `src/migrations/`.

### Production checklist

- [ ] Set `DATABASE_URL` (Neon/managed) or `DB_*`, `JWT_SECRET`, `ENCRYPTION_KEY`, `STRIPE_*`, `CORS_ORIGINS`
- [ ] `NODE_ENV=production` (migrations run automatically on boot)
- [ ] Set `TRUST_PROXY` to the real number of proxy hops
- [ ] Rotate any credential that was ever committed (DB passwords, CF Access tokens)
- [ ] Keep `BILLING_BYPASS_QUOTA=false`, `ENABLE_DEBUG_PAGES` unset

## Docker

```bash
docker compose up -d                    # postgres + redis + pgbouncer + api + web
docker compose --profile production up  # adds nginx (TLS on :443)
```

PgBouncer credentials are generated at container start from `DB_USER`/`DB_PASSWORD` — no secrets in `pgbouncer/` (see `entrypoint-userlist.sh`). DB/Redis/API/Web ports bind to `127.0.0.1`; nginx terminates TLS and proxies `/api/` (WebSocket + SSE) and the web app.

## Roadmap

See [TODO.md](./TODO.md) for the detailed task list.

**Branches:**
- `main` — stable, production-ready
- `stage` — pre-production integration
- `dev` — active development

---

## License

Private — Stiamond © 2026
