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
| Backend | NestJS 10, TypeORM, Passport JWT |
| Database | PostgreSQL 16 |
| AI / LLM | Ollama (llama3.2 by default) |
| Frontend | Next.js 14, React, Tailwind CSS |
| State | Zustand |
| HTTP Client | Axios |
| Auth | JWT + bcrypt |
| Containerization | Docker + Docker Compose |

---

## Project Structure

```
bot_int/
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   └── modules/
│   │   │       ├── auth/           # Register, Login, JWT strategy
│   │   │       ├── tenants/        # Multi-tenant management
│   │   │       ├── agents/         # AI agent CRUD
│   │   │       ├── chat/           # Conversations + Ollama integration
│   │   │       ├── knowledge/      # Document ingestion & search
│   │   │       └── leads/          # Lead capture & CRM
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

- Node.js >= 20 (recommended: v24 via nvm)
- PostgreSQL running locally (or via Docker)
- [Ollama](https://ollama.ai) installed and running

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

### 5. Start Ollama and pull a model

```bash
ollama serve
ollama pull llama3.2
```

### 6. Run the project

```bash
npm run dev
```

This starts both API (`http://localhost:3001/api`) and Web (`http://localhost:3000`) in parallel via Turborepo.

---

## Environment Variables

`apps/api/.env`:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=stiamond
DB_PASSWORD=stiamond123
DB_NAME=stiamond_agent

JWT_SECRET=your_very_long_random_secret_here

OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create tenant + admin user |
| POST | `/api/auth/login` | Get JWT token |

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

## Roadmap

See [TODO.md](./TODO.md) for the detailed task list.

**Branches:**
- `main` — stable, production-ready
- `stage` — pre-production integration
- `dev` — active development

---

## License

Private — Stiamond © 2026
