# TODO — Bot-Int AI Agent Platform

> Legend: ✅ Done · 🔄 In Progress · ⬜ Pending · 🔥 Priority
> Dernière mise à jour : 18 août 2026

---

## Phase 1 — Foundation (MVP) ✅

### Monorepo & Infrastructure
- [x] Turborepo monorepo setup with npm workspaces
- [x] `tsconfig.base.json` shared config
- [x] `docker-compose.yml` for PostgreSQL
- [x] `.gitignore`, `.npmrc` workspace fixes
- [x] Git branches: `main`, `stage`, `dev`
- [x] GitHub repository: `senankponjosuekpodekon/bot-int`

### Backend — NestJS API
- [x] `main.ts` with global prefix `/api`, CORS, ValidationPipe
- [x] `AppModule` with TypeORM + ConfigModule
- [x] **Auth module** — Register, Login, JWT strategy, Guard, bcrypt
- [x] **Tenants module** — Entity, Service, Controller (multi-tenant isolation)
- [x] **Agents module** — CRUD, entity with type/persona/systemPrompt
- [x] **Chat module** — Conversation + Message entities, OllamaService, ChatService
- [x] **Knowledge module** — Document ingestion, text search
- [x] **Leads module** — Lead entity, status pipeline, CRUD
- [x] **Products module** — CRUD, import (Shopify, WooCommerce, CSV, sitemap, feed)
- [x] **Billing module** — Stripe, plans, usage, API keys, webhooks
- [x] **Intelligence module** — Conversation analytics, insights, platform metrics
- [x] **Flows module** — Conversation flow builder
- [x] **Quotes module** — Automated quote generation
- [x] **Widget module** — Embeddable chat widget
- [x] **Notifications module** — Email, SMS, Telegram notifications
- [x] **Surveys module** — Customer satisfaction surveys
- [x] **Site module** — Landing page builder
- [x] **Admin module** — Admin dashboard
- [x] **Integrations module** — External integrations
- [x] **Regions module** — Regional adaptation (9 profiles, detection, dynamic system prompt)

### Frontend — Next.js
- [x] Next.js 14 app router setup
- [x] Tailwind CSS + PostCSS
- [x] Global styles with custom components (btn, card, input)
- [x] Axios API client with JWT interceptor (`lib/api.ts`)
- [x] Zustand auth store (persist to localStorage)
- [x] Login page
- [x] Register page
- [x] Dashboard layout with Sidebar
- [x] Dashboard overview page (stats)
- [x] Agents management page (list, create, delete)
- [x] Chat testing page (real-time conversation with agent)
- [x] Leads page (`/dashboard/leads`)
- [x] Knowledge base page (`/dashboard/knowledge`)
- [x] Conversation history viewer
- [x] Toast notifications (success/error feedback)
- [x] CurrencyProvider (USD/EUR with IP-based geo-detection)
- [x] LocaleSwitcher (EN/FR/DE/AR)

### Landing Pages & i18n
- [x] English landing page (`/`) — hero, features, use cases, comparison, pricing, testimonials, FAQ, CTA, GEO block, footer, newsletter, sticky mobile CTA
- [x] French landing page (`/fr`) — full translation
- [x] German landing page (`/de`) — full translation
- [x] Arabic landing page (`/ar`) — full translation + RTL layout
- [x] Sitemap avec toutes les routes (EN/FR/DE/AR + legal pages)
- [x] hreflang alternates (en-US, fr-FR, de-DE, ar-AE)
- [x] OpenGraph metadata + alternateLocale
- [x] schema.org markup (HowTo, FAQPage)

### Legal Pages
- [x] `/terms` — Terms of Service (EN) — 11 sections
- [x] `/privacy` — Privacy Policy (EN) — 11 sections
- [x] `/gdpr` — GDPR Compliance (EN) — DPA, sub-processors, breach notification
- [x] `/fr/terms` — CGU (FR)
- [x] `/fr/privacy` — Politique de confidentialité (FR)
- [x] `/fr/gdpr` — Conformité RGPD (FR)

---

## Sprint — Final QA & Launch

1. **Sécurité & conformité**
   - [x] Résoudre les vulnérabilités `npm audit` (API + Web) — 0 vulnérabilités après upgrade Next.js 16.3.1
   - [x] Vérifier que tous les secrets `.env` sont chiffrés/stockés — JWT_SECRET validation stricte en production, .env.example à jour
2. **Qualité & tests**
   - [x] 🔥 Fixer les 5 tests échoués (leads.service.spec.ts, chat.service.spec.ts) — 27/27 passent
   - [x] Ajouter tests unitaires (IntelligenceService, RegionsService, BillingService)
   - [x] Ajouter tests E2E (Playwright) pour le flow agent → chat → lead — ✅ test passe (15.1s)
   - [x] Mettre en place GitHub Actions (lint + test + build)
3. **Observabilité & Ops**
   - [x] Ajouter logger structuré & traçage (NestJS LoggingMiddleware + Sentry API + Sentry Web)
   - [x] Script `make setup` (Docker + seed — demo tenant, user, agents, leads, knowledge)
4. **Expérience produit**
   - [x] Vue détaillée du lead (timeline, commentaires, pièces jointes)
   - [x] Export / partage transcript conversation (PDF / email)
   - [x] Filtres conversations par canal/date + recherche plein texte
   - [x] i18n: Pages légales FR + DE + AR (terms, privacy, gdpr) avec RTL Arabic + footer links corrigés + sitemap

---

## Phase 2 — Core Features 🔄

### Backend
- [x] 🔥 Add `clsx` dependency to web package.json
- [x] Lead auto-creation from chat conversations
- [x] Rate limiting per tenant (`@nestjs/throttler` — ThrottlerGuard 100 req/min)
- [x] Cache API (CacheService in-memory, CacheModule global) — products + billing
- [x] 🔥 DTO validation with `class-validator` on all endpoints (API complète)
- [x] Agent `PATCH` endpoint — full update with DTO
- [x] Chat — inject knowledge base context into Ollama prompt (RAG)
- [x] File upload for knowledge documents (PDF, DOCX)
- [x] Pagination on all list endpoints (`/agents`, `/leads`, `/knowledge`)
- [x] Webhook support — notify external systems on new lead/conversation
- [x] Swagger / OpenAPI documentation (`@nestjs/swagger`)
- [x] Lead auto-tagging (LeadTagService — intent, source, language, region, agent type, funnel stage)

### Frontend
- [x] 🔥 Leads page (`/dashboard/leads`)
- [x] 🔥 Knowledge base page (`/dashboard/knowledge`)
- [x] Conversation history viewer
- [x] Toast notifications (success/error feedback)
- [x] Dashboard loading skeleton (`dashboard/loading.tsx`)
- [x] Agent detail/edit page
- [x] Lead detail page avec timeline/status
- [x] Loading skeletons pour toutes les pages
- [x] Responsive mobile layout

### Intelligence — Boucle fermée ✅
- [x] recordConversation() — enregistre chaque échange (intent, knowledge, products)
- [x] detectUnansweredQuestions() — cron horaire, extraction mots-clés bilingue
- [x] detectTrends() — cron horaire, intents sur 24h
- [x] analyzeLeadPatterns() — cron quotidien, patterns de conversion
- [x] generateSuggestions() — cron quotidien, suggestions d'enrichissement
- [x] autoAdjustLeadScoring() — ajuste les scores des leads en DB selon patterns
- [x] autoOptimizePrompts() — modifie les system prompts des agents en DB
- [x] autoEnrichUnansweredKnowledge() — enrichit la KB via DuckDuckGo automatiquement
- [x] pushPlatformRecommendations() — pousse les best practices cross-tenant
- [x] extractKeywords() — bilingue (FR + EN stop words)
- [x] Endpoints manuels : auto-adjust-scoring, auto-optimize-prompts, auto-enrich-unanswered
- [x] Platform dashboard + recommendations endpoints

### Geo & Currency
- [x] IP-based currency detection (ipapi.co → EUR/USD)
- [x] Fallback navigator.language
- [x] localStorage priority over auto-detection
- [x] EU country detection (FR, DE, ES, IT, NL, BE, PT, AT, IE)

### Regional Adaptation ✅
- [x] RegionProfile types + 9 profiles (us, uk, ae, sa, de, ch, fr, sg, international)
- [x] RegionsService — detection via phone, timezone, browser language, IP geolocation
- [x] Dynamic system prompt builder (tone, selling points, compliance per region)
- [x] ChatService integration — auto-detects region, injects adapted prompt
- [x] ChatGateway + ChatController pass regionContext
- [x] REST endpoints: `GET /regions`, `GET /regions/detect`, `POST /regions/prompt`
- [x] Arabic system prompts (ae + sa profiles) with MSA
- [x] Compliance notes per region (GDPR, CCPA, PDPL, PDPA)

---

## Phase 3 — Advanced AI 🔥

### RAG Pipeline
- [x] LLM provider abstraction (LLMProvider interface + OllamaProvider + OpenAIProvider + LLMService factory)
- [x] Vector embeddings for knowledge documents (Ollama embeddings API)
- [x] pgvector extension for PostgreSQL (pgvector/pg16 image + auto-migration on startup)
- [x] Semantic search on knowledge base (cosine similarity via pgvector + JS fallback)
- [x] Context injection: retrieve top-k relevant docs before Ollama call
- [ ] Python microservice for advanced RAG (FastAPI + LangChain)

### Agent Intelligence
- [x] Agent memory (persistent context across conversations — AgentMemory entity + auto-extraction)
- [x] Multi-step workflows (chained agents — AgentWorkflow entity + step executor)
- [x] Agent tools (web search, calculator, calendar — AgentToolsService with LLM-based tool routing)
- [x] Fallback/escalation to human operator (/human command + escalationTopics + workflow handoff step)
- [x] Tool detection gated behind `toolsEnabled` flag (opt-in per agent, skips short messages)
- [x] Memory TTL — auto-cleanup of low-importance memories after 90 days (cron at 5am)
- [x] Workflow auto-trigger in ChatService (keyword + funnel_stage triggers)
- [x] Dashboard UI — Memory viewer + Workflow builder pages

---

## Phase 4 — Multi-Channel Deployment 🔄

- [x] Embeddable chat widget (JavaScript snippet) — Full standalone JS bundle with chat, products, flows, surveys
- [x] WhatsApp integration (via Meta API) — Webhook receiver + sendWhatsApp in IntegrationsService
- [x] Telegram bot integration — Webhook setup + receiveTelegram + sendTelegram
- [x] Email channel — SendGrid integration (send + Inbound Parse webhook receiver)
- [x] REST API for custom channel integration — Channels module with ApiKeyGuard (message, conversations, history, webhooks)
- [x] Analytics dashboard (message volume, response time, lead conversion) — Channel analytics endpoint + dashboard page

---

## Phase 5 — Production 🔄

### DevOps
- [x] Dockerfile optimization (multi-stage, slim images) — API + Web with node:20-slim, healthchecks
- [x] Docker Compose production profile — Postgres + Redis + API + Web + Nginx (production profile)
- [x] GitHub Actions CI/CD pipeline — lint, test, build, Docker image build on main
- [x] Nginx reverse proxy config — SSL/TLS, security headers, WebSocket support, gzip
- [ ] SSL/TLS setup — Nginx config ready, certificates need to be provisioned (Let's Encrypt)
- [ ] Environment secrets management — .env in production, consider Vault/AWS Secrets Manager

### Security & Compliance
- [x] Legal pages (Terms, Privacy, GDPR — EN + FR)
- [x] EU hosting trust badge on landing pages
- [x] ThrottlerGuard (100 req/min)
- [x] JWT auth + bcrypt + Helmet headers
- [x] Refresh token rotation — old token revoked on refresh, new pair issued
- [x] Role-based access control — UserRole enum (SUPER_ADMIN, ADMIN, MANAGER, VIEWER) + RolesGuard + @Roles() decorator
- [x] GDPR data export/delete endpoints — GET /gdpr/export, DELETE /gdpr/delete, GET /gdpr/audit-log
- [x] Audit logs — AuditLog entity + AuditInterceptor + GdprService.logAudit()
- [ ] Tenant data encryption at rest — requires PostgreSQL TDE or app-level encryption

### Scalability
- [x] In-memory cache (CacheService — products 60s, billing 30s, categories 300s)
- [x] Cache invalidation on mutations (create/update/delete)
- [x] Dashboard lazy loading (Suspense fallback)
- [x] Redis in docker-compose (redis:7-alpine with persistence volume)
- [ ] Redis for session/cache — Redis container ready, needs cache-manager-redis-store integration
- [ ] BullMQ for async job queue (document processing, emails)
- [ ] Horizontal scaling with load balancer
- [ ] Database connection pooling (PgBouncer)

---

## i18n — Internationalisation

- [x] English (root `/`) — landing page + legal pages
- [x] French (`/fr`) — landing page + legal pages
- [x] German (`/de`) — landing page
- [x] Arabic RTL (`/ar`) — landing page + RTL layout + Noto Sans Arabic font
- [x] German legal pages (`/de/terms`, `/de/privacy`, `/de/gdpr`)
- [x] Arabic legal pages (`/ar/terms`, `/ar/privacy`, `/ar/gdpr`)
- [x] i18n framework (next-intl) pour factoriser les traductions

---

## Bugs & Technical Debt

- [x] 🔥 Fix: 5 tests échoués (leads.service.spec.ts, chat.service.spec.ts) — 27/27 passent maintenant
- [x] Fix: `clsx` missing from `apps/web/package.json` (used in Sidebar)
- [x] Fix: Next.js upgrade to 16.3.1 (security patch)
- [x] Fix: npm audit — 0 vulnérabilités
- [ ] Clean: remove duplicate `PATH` export in `.zshrc`
- [ ] Clean: `package-lock.json` should be gitignored or committed consistently

### Audit Fixes (Phase 5 Security Review)
- [x] Swagger API docs disabled in production (`main.ts`)
- [x] Shopify webhook HMAC signature verification (`products-webhook.controller.ts`)
- [x] RBAC `@Roles()` enforced on admin-only endpoints — billing (checkout/change-plan/cancel), agents (create/update/delete), integrations (upsert), webhooks (CRUD)
- [x] Channels page uses axios interceptor instead of raw `localStorage.getItem` (`channels/page.tsx`)
- [x] Channel webhooks persisted to DB via `WebhookService` instead of in-memory Map (`channels.controller.ts`)
- [x] Password complexity validation — uppercase, lowercase, number required (`register.dto.ts`)
- [x] Missing `loading.tsx` for 5 pages — channels, memory, workflows, agents/[id], leads/[id]

### Phase 5 — Production & Scalability
- [x] Redis-backed cache service with in-memory fallback (`cache.service.ts`, `package.json`, `billing.controller.ts`, `products.controller.ts`)
- [x] `leads.service.spec.ts` constructor fixed for `LeadComment` repository
- [x] TypeORM migrations infrastructure confirmed (`typeorm.config.ts`, `src/migrations/*`)
- [x] PII / sensitive tokens redacted in HTTP logs (`logging.middleware.ts`)
- [x] Tests for uncovered modules — webhooks (`webhook.service.spec.ts`), channels (`channels.controller.spec.ts`), gdpr (`gdpr.controller.spec.ts`)
- [x] BullMQ async queue for heavy operations (`modules/queue`, `products.controller.ts`)
- [x] Redis session storage (`auth/session.service.ts`, `auth/session.controller.ts`, `auth.service.ts`)
- [x] PgBouncer connection pooling (`docker-compose.yml`, `pgbouncer/pgbouncer.ini`, `pgbouncer/userlist.txt`)
- [x] Data encryption at rest — AES-256-GCM `CryptoService` + encrypted `WebhookEndpoint.secret` and sensitive `Integration.config` keys
- [x] SSL/TLS Let’s Encrypt helper script (`scripts/init-ssl.sh`, `.env.example`)
- [x] Secrets management notes (see Runbook below)

---

## Notes

- Ollama model default: `llama3.1` — change via `OLLAMA_MODEL` env var
- TypeORM `synchronize: true` in dev — switch to migrations for production
- All API endpoints require JWT except `POST /api/auth/register` and `POST /api/auth/login`
- Cache TTL: 300s (default), 60s (products), 30s (billing)
- Intelligence cron: hourly (unanswered, trends) + daily 3am (patterns, suggestions, auto-adjust, auto-optimize, auto-enrich, platform push) + daily 4am (platform analysis)
- Default locale: English at root (`/`), French at `/fr`, German at `/de`, Arabic at `/ar` (RTL)
- Default currency: USD, with EUR auto-detection via IP geolocation
- Region detection: phone → timezone → browser language → IP geolocation → international fallback
- Region profiles: us, uk, ae, sa, de, ch, fr, sg, international (9 profiles)
- Arabic font: Noto Sans Arabic (loaded via Google Fonts in root layout)

---

## Production Runbook

### Secrets management
- Store `JWT_SECRET`, `ENCRYPTION_KEY`, `SHOPIFY_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` and third-party API keys in HashiCorp Vault or the cloud provider secret manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault).
- At container startup, inject secrets as environment variables. Do not commit `.env` files with real values.
- Rotate `ENCRYPTION_KEY` only through a migration re-encrypting existing data; keep the old key available for decryption during rotation.
- For local dev, copy `.env.example` → `.env` and fill in non-production values.

### SSL / Let’s Encrypt
- Nginx config already enforces HTTPS and HSTS (`nginx/nginx.conf`).
- Run `scripts/init-ssl.sh <domain> <email>` to generate certificates with Certbot before starting `docker compose --profile production up`.
- Mount the generated `nginx/ssl/` directory so Nginx can serve `fullchain.pem` and `privkey.pem`.

### PgBouncer
- `docker-compose.yml` now includes a `pgbouncer` service listening on port `6432` in transaction pool mode.
- The API connects to `pgbouncer:6432` automatically in the Docker production profile.
- Update `pgbouncer/userlist.txt` if you change `DB_USER` / `DB_PASSWORD`.

### BullMQ
- Requires `REDIS_URL`. The queue names are `shopify-imports` and `webhooks`.
- Workers run inside the API process (`@Processor` decorators). For heavy load, run dedicated worker processes or scale the API container.

---

## Vision — Google Digital Marketing & E-commerce

> Objectif : Stiamond doit devenir une plateforme tout-en-un où une entreprise connectée peut gérer toute sa croissance marketing, tous les rôles d'une équipe marketing, avec rapports automatiques aux stakeholders.

### Cursus Google Digital Marketing & E-commerce (8 cours)

- [x] Course 1 — Foundations of Digital Marketing and E-commerce ✅
- [x] Course 2 — Attract and Engage Customers with Digital Marketing ✅
- [x] Course 3 — From Likes to Leads: Interact with Customers Online ✅
- [x] Course 4 — Think Outside the Inbox: Email Marketing ✅
- [ ] Course 5 — Assess for Success: Marketing Analytics and Measurement (85% — en cours)
- [ ] Course 6 — Make the Sale: Build, Launch, and Manage E-commerce Stores
- [ ] Course 7 — Satisfaction Guaranteed: Develop Customer Loyalty Online
- [ ] Course 8 — Accelerate Your Job Search with AI

### Modules Stiamond à implémenter pour couvrir la vision

- [ ] **Marketing Analytics Dashboard** — ROI par canal, CAC, LTV, attribution multi-touch
- [ ] **Email Marketing Automation** — campagnes, séquences, A/B testing (SendGrid)
- [ ] **E-commerce Store Builder** — storefront, panier, checkout (Stripe)
- [ ] **Customer Loyalty Program** — points, rewards, NPS surveys
- [ ] **Social Media Management** — scheduling, analytics, listening
- [ ] **SEO Tools** — keyword tracking, content optimization
- [ ] **Stakeholder Reports** — rapports automatiques PDF/email hebdomadaires
- [ ] **Marketing Funnel Builder** — visual funnel with conversion rates
- [ ] **Ad Campaign Manager** — Meta Ads, Google Ads integration
- [ ] **Customer Journey Mapping** — touchpoint tracking across channels
