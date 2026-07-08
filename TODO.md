# TODO — Bot-Int AI Agent Platform

> Legend: ✅ Done · 🔄 In Progress · ⬜ Pending · 🔥 Priority

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

---

## Phase 2 — Core Features 🔄

### Backend
- [ ] 🔥 Add `clsx` dependency to web package.json
- [ ] 🔥 DTO validation with `class-validator` on all endpoints
- [ ] Agent `PATCH` endpoint — full update with DTO
- [ ] Chat — inject knowledge base context into Ollama prompt (RAG)
- [ ] Lead auto-creation from chat conversations
- [ ] File upload for knowledge documents (PDF, DOCX)
- [ ] Pagination on all list endpoints (`/agents`, `/leads`, `/knowledge`)
- [ ] Webhook support — notify external systems on new lead/conversation
- [ ] Rate limiting per tenant (`@nestjs/throttler`)
- [ ] Swagger / OpenAPI documentation (`@nestjs/swagger`)

### Frontend
- [ ] 🔥 Leads page (`/dashboard/leads`)
- [ ] 🔥 Knowledge base page (`/dashboard/knowledge`)
- [ ] Agent detail/edit page
- [ ] Conversation history viewer
- [ ] Lead detail page with status update
- [ ] Toast notifications (success/error feedback)
- [ ] Loading skeletons for data fetching
- [ ] Responsive mobile layout

---

## Phase 3 — Advanced AI 🔥

### RAG Pipeline
- [ ] Vector embeddings for knowledge documents (Ollama embeddings API)
- [ ] pgvector extension for PostgreSQL
- [ ] Semantic search on knowledge base
- [ ] Context injection: retrieve top-k relevant docs before Ollama call
- [ ] Python microservice for advanced RAG (FastAPI + LangChain)

### Agent Intelligence
- [ ] Agent memory (persistent context across conversations)
- [ ] Multi-step workflows (chained agents)
- [ ] Agent tools (web search, calculator, calendar)
- [ ] Fallback/escalation to human operator

---

## Phase 4 — Multi-Channel Deployment ⬜

- [ ] Embeddable chat widget (JavaScript snippet)
- [ ] WhatsApp integration (via Meta API)
- [ ] Telegram bot integration
- [ ] Email channel
- [ ] REST API for custom channel integration
- [ ] Analytics dashboard (message volume, response time, lead conversion)

---

## Phase 5 — Production ⬜

### DevOps
- [ ] Dockerfile optimization (multi-stage, slim images)
- [ ] Docker Compose production profile
- [ ] GitHub Actions CI/CD pipeline
- [ ] Environment secrets management
- [ ] Nginx reverse proxy config
- [ ] SSL/TLS setup

### Security & Compliance
- [ ] Refresh token rotation
- [ ] Role-based access control (admin, agent, viewer)
- [ ] Tenant data encryption at rest
- [ ] Audit logs
- [ ] GDPR data export/delete endpoints

### Scalability
- [ ] Redis for session/cache
- [ ] BullMQ for async job queue (document processing, emails)
- [ ] Horizontal scaling with load balancer
- [ ] Database connection pooling (PgBouncer)

---

## Bugs & Technical Debt

- [ ] Fix: `clsx` missing from `apps/web/package.json` (used in Sidebar)
- [ ] Fix: Next.js upgrade to 15 (security patch for 14.2.0)
- [ ] Fix: npm audit — address high severity vulnerabilities
- [ ] Clean: remove duplicate `PATH` export in `.zshrc`
- [ ] Clean: `package-lock.json` should be gitignored or committed consistently

---

## Notes

- Ollama model default: `llama3.2` — change via `OLLAMA_MODEL` env var
- TypeORM `synchronize: true` in dev — switch to migrations for production
- All API endpoints require JWT except `POST /api/auth/register` and `POST /api/auth/login`
