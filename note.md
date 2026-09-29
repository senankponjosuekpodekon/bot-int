Voici la **spécification complète niveau ingénieur** de ton système — version exploitable pour construire réellement le produit (MVP → scalable SaaS).

Je vais structurer comme un vrai **document d’architecture + produit + engineering backlog**.

---

# 1. ARCHITECTURE GLOBALE (AI AGENT PLATFORM)

## 1.1 Vision système

Plateforme SaaS multi-tenant où chaque entreprise possède :

* un ou plusieurs agents IA
* une base de connaissance
* des canaux de diffusion (web, WhatsApp, Instagram, API)
* un dashboard d’analyse et contrôle
l'objectif est de pouvoir integrer le bot a n'importe quel site web et n'importe quel canal de communication
---

## 1.2 Architecture logique

```txt
                 ┌──────────────────────┐
                 │   CANAUX UTILISATEUR │
                 │ Web / WhatsApp / IG  │
                 └─────────┬────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   API GATEWAY        │
                │ Auth + Routing       │
                └─────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ AGENT ENGINE │  │ KNOWLEDGE DB │  │ WORKFLOW ENG │
│ (LLM Layer)  │  │ (RAG System) │  │ (Automation) │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼

┌────────────────────────────────────────────┐
│                DATA LAYER                  │
│ PostgreSQL + Vector DB + Object Storage    │
└────────────────────────────────────────────┘
```

---

# 2. CORE MODULES

---

## 2.1 Multi-tenant SaaS Core

Chaque entreprise = tenant isolé

### Tables clés

* tenants
* users
* agents
* conversations
* messages
* integrations

---

## 2.2 Agent Engine (cœur du système)

Responsabilités :

* comprendre intention utilisateur
* choisir stratégie de réponse
* appeler outils (tools)
* accéder à la mémoire
* déclencher workflows

### Pipeline :

```txt
User Message
   ↓
Intent Detection
   ↓
Retriever (RAG)
   ↓
Agent Router
   ↓
Tool Calling (optional)
   ↓
Response Generation
   ↓
Memory Update
```

---

## 2.3 Knowledge Engine (RAG)

### Sources :

* site web (scraping)
* PDF
* Word / Excel
* FAQ
* manuel produit
* base CRM

### Pipeline ingestion :

```txt
Document Upload
   ↓
Chunking
   ↓
Embedding
   ↓
Vector DB Storage
   ↓
Indexation metadata
```

### Vector DB :

* Qdrant / Weaviate / Pinecone

---

## 2.4 Workflow Engine

Permet automation métier :

Exemple :

```txt
IF message contains "prix"
→ send catalog

IF lead score > 80
→ notify sales

IF no reply after 24h
→ auto follow-up
```

---

## 2.5 Channel Layer

### Web widget

* script JS universel

```html
<script src="https://platform.ai/widget.js" data-agent="ID"></script>
```

---

### WhatsApp integration

Basé sur WhatsApp Business API via Meta

WhatsApp Business

Capabilities :

* message inbound/outbound
* templates
* session management
* handover human

---

### Instagram / Messenger

* DM automation
* lead capture
* reply sync

---

# 3. DATA MODEL (DATABASE)

---
h
## 3.1 tenants

```sql
id
name
email
plan
created_at
```

---

## 3.2 agents

```sql
id
tenant_id
name
type (sales/support/hr/etc)
personality
system_prompt
status
```

---

## 3.3 conversations

```sql
id
agent_id
channel
user_id
status
created_at
```

---

## 3.4 messages

```sql
id
conversation_id
role (user/assistant/system)
content
metadata
timestamp
```

---

## 3.5 knowledge_documents

```sql
id
tenant_id
type (pdf/web/text)
source_url
content
embedding_id
created_at
```

---

## 3.6 leads

```sql
id
tenant_id
name
phone
email
score
status
source
```

---

## 3.7 workflows

```sql
id
tenant_id
trigger
condition
action
status
```

---

# 4. API DESIGN (BACKEND)

---

## Auth

```http
POST /auth/register
POST /auth/login
```

---

## Agent

```http
POST /agents/create
GET /agents/:id
POST /agents/:id/update
DELETE /agents/:id
```

---

## Conversation

```http
POST /chat/send
GET /chat/history/:conversation_id
```

---

## Knowledge

```http
POST /knowledge/upload
POST /knowledge/sync-url
GET /knowledge/search
```

---

## Workflow

```http
POST /workflow/create
POST /workflow/trigger
GET /workflow/list
```

---

## Lead

```http
GET /leads
POST /leads/update
```

---

# 5. AI PIPELINE (VERY IMPORTANT)

---

## 5.1 Prompt System

```txt
SYSTEM:
You are an AI agent for {company_name}.

Rules:
- Always be concise
- Always try to convert the user into a lead
- Use company knowledge base first
- If uncertain, ask questions
```

---

## 5.2 RAG Retrieval

```txt
User question
   ↓
Embedding query
   ↓
Vector DB search
   ↓
Top 5 chunks
   ↓
Injected into prompt
```

---

## 5.3 Tool Calling

Tools available :

* create_lead
* create_meeting
* send_email
* fetch_order
* create_ticket

---

# 6. FRONTEND (DASHBOARD SaaS)

---

## Pages

### Dashboard

* leads
* conversations
* analytics

---

### Agent Builder

* name
* prompt
* tone
* objectives

---

### Knowledge Base

* upload files
* sync website
* manage embeddings

---

### Conversations

* live chat inbox
* filter by agent/channel

---

### Analytics

* conversion rate
* response time
* lead score
* top questions

---

### Integrations

* WhatsApp
* Instagram
* Shopify
* Stripe
* Zapier / n8n

---

# 7. MVP (30 JOURS - ULTRA CONCRET)

---

## SEMAINE 1

* Auth system
* multi-tenant DB
* basic chat endpoint
* simple LLM integration

---

## SEMAINE 2

* knowledge upload PDF
* basic RAG
* widget web chat

---

## SEMAINE 3

* lead capture system
* dashboard simple
* conversation storage

---

## SEMAINE 4

* WhatsApp integration
* agent configuration UI
* analytics basiques
* deployment SaaS

---

# 8. STACK TECH RECOMMANDÉE

---

## Backend

* Node.js (NestJS) ou Laravel
* Python microservice (RAG / embeddings)

---

## Frontend

* React / Next.js

---

## DB

* PostgreSQL

---

## Vector DB

* Qdrant (simple + local possible)

---

## Queue system

* Redis / BullMQ

---

## AI Layer

* OpenAI / Claude / Ollama

---

## Infrastructure

* Docker
* Nginx
* AWS / OVH

---

# 9. BUSINESS MODEL

---

## SaaS Pricing

* Basic Agent : 19$–49$/mois
* Pro Agent : 99$/mois
* Business OS : 199$–499$/mois

---

## Add-ons

* conversations volume
* WhatsApp integration
* extra agents
* API usage

---

# 10. EVOLUTION STRATÉGIQUE

---

## Phase 1 (NOW)

AI Agent Platform (chat + widget + knowledge)

## Phase 2

Omnichannel + WhatsApp + Instagram

## Phase 3

Automation + workflows + CRM intégré

## Phase 4

AI Business OS complet

## Phase 5

Marketplace d’agents spécialisés

---

# CONCLUSION STRATÉGIQUE

Tu ne construis pas :

* un chatbot
* un assistant
* un outil SaaS

Tu construis :

> **une infrastructure de travail numérique pour entreprises**

Le produit initial (chat widget + agent IA) est juste la porte d’entrée.

---

Si tu veux la suite logique, je peux te produire maintenant :

1. **Schéma Figma complet UI/UX du SaaS**
2. **Code backend starter (NestJS ou Laravel prêt prod)**
3. **Prompt engineering system complet (ultra optimisé vente + conversion)**
4. **Architecture microservices scalable production**
5. **Roadmap levée de fonds + pitch deck investisseur**

Dis-moi juste la prochaine brique.

------------------------------------


Oui, et c'est un axe qu'on n'a pas encore couvert du tout — bien vu. Les tools (function calling) posent exactement le même problème d'isolation que le knowledge et les products, mais à **trois niveaux différents**, dont un est plus dangereux que tout ce qu'on a traité jusqu'ici parce qu'il touche à l'exécution, pas juste au texte du prompt.

## Les trois niveaux à isoler

```text
1. SÉLECTION      → quels tools sont chargés pour cet agent ?
2. EXÉCUTION       → que fait réellement le tool quand il tourne ?
3. DESCRIPTION     → que dit le schéma du tool au LLM ?
```

### 1. Sélection — le même principe que les modules verticaux

Un agent e-commerce n'a aucune raison de voir `book_appointment` ou `search_properties` dans sa liste de tools disponibles, et un agent médical ne devrait jamais avoir accès à `process_refund`. C'est le prolongement naturel du découpage core/modules qu'on a défini :

```ts
const toolsByVertical: Record<AgentType, Tool[]> = {
  ecommerce: [searchProducts, checkStock, createOrder],
  immobilier: [searchProperties, scheduleViewing],
  restaurant: [getMenu, reserveTable],
  medical: [checkAvailability, bookAppointment],
  marketing: [createCampaign, getCampaignStats],
};

const tools = [...coreTools, ...toolsByVertical[activeAgent.type]];
```

Moins de tools exposés = moins de surface d'erreur, exactement le même raisonnement que "moins de bruit dans le contexte = moins d'hallucination" qu'on a vu plus tôt.

### 2. Exécution — c'est ici que le vrai risque se cache

C'est le point le plus important, et il est différent de tout ce qu'on a traité jusqu'à présent : **ne fais jamais confiance à un `businessId`/`agentId` que le modèle fournirait lui-même dans les arguments d'un appel de tool.**

```ts
// ❌ DANGEREUX
async function searchProducts(args: { businessId: string; query: string }) {
  return productsRepo.find({ businessId: args.businessId, ...});
}

// ✅ CORRECT
async function searchProducts(args: { query: string }, ctx: ServerContext) {
  // businessId vient du contexte serveur, jamais des arguments du modèle
  return productsRepo.find({ businessId: ctx.activeAgent.businessId, ...});
}
```

Pourquoi ça compte particulièrement : un tool, contrairement au knowledge ou au system prompt, est **exécutable**. Si le modèle peut influencer quel `businessId` est interrogé — via une injection de prompt, une manipulation de la conversation, ou même juste une hallucination du modèle qui invente un id plausible — tu n'as plus une fuite d'identité dans une réponse texte, tu as une vraie fuite de données d'une entreprise vers une autre, voire une action réelle (créer une commande, réserver un créneau) exécutée sur le mauvais business. Le principe : le `businessId`/`agentId` doit toujours venir du contexte serveur de la session active, jamais d'un paramètre que le LLM remplit.

### 3. Description — même piège que `region-profiles.ts`, sous une autre forme

Le schéma d'un tool (son `name` et sa `description`) est lui aussi injecté dans le contexte envoyé au LLM. Vérifie qu'aucun de tes tools n'a une description codée en dur avec du contenu identitaire, du genre :

```ts
// ❌ à vérifier dans ton code
{
  name: "search_products",
  description: "Recherche dans le catalogue Stiamond..." // fuite potentielle
}
```

La description doit rester générique ("Recherche un produit dans le catalogue de l'entreprise active"), jamais nommer une marque. C'est exactement le même type de bug que celui qu'on vient de trouver dans `region-profiles.ts` — du texte censé être neutre mais qui contient en réalité une identité commerciale figée.

## Le lien avec les `Policies` du core commun

Ça complète directement un point qu'on avait laissé abstrait plus tôt : dans le schéma core/modules, `Policies` définissait "ce que l'agent a le droit de faire (recommander, réserver, rembourser…)". Les tools sont le mécanisme **concret** qui applique cette policy — pas une instruction textuelle dans le prompt ("tu ne dois pas faire de remboursement"), qui reste toujours contournable par un modèle, mais l'**absence pure et simple du tool** dans la liste chargée pour cet agent. Un agent qui n'a pas `process_refund` dans ses tools ne peut structurellement pas rembourser, quoi que dise le prompt. C'est une garantie bien plus solide que du texte.

## Une distinction supplémentaire à ajouter : lecture vs écriture

Sépare tes tools en deux catégories, parce que le risque n'est pas symétrique :

- **Lecture** (`search_products`, `check_availability`) : le risque, c'est la fuite de données cross-business.
- **Écriture** (`create_order`, `book_appointment`, `process_refund`) : le risque, c'est une action réelle mal attribuée — plus grave, parce qu'irréversible ou coûteuse. Pour ces tools-là, ajoute un log d'audit systématique (`tenantId`, `businessId`, `agentId`, `visitorId`, action, timestamp) — indépendamment du reste, pour pouvoir tracer et corriger vite si quelque chose a mal tourné.

## À ajouter à ta suite de tests

Le même esprit que tes 5 tests d'isolation, appliqué aux tools :

- Demander à l'agent Business A d'appeler un tool avec un id de Business B injecté dans le message utilisateur ("cherche le produit avec businessId=xyz") → le tool doit ignorer ce paramètre et utiliser le contexte serveur.
- Vérifier qu'un agent e-commerce n'a tout simplement pas `book_appointment` dans sa liste de tools disponibles.
- Vérifier qu'aucune description de tool ne contient de nom de marque en la comparant à une liste noire simple.C'est une bonne intuition parce que les tools sont en réalité la catégorie la plus dangereuse des trois qu'on a vues (knowledge, mémoire, tools) — c'est la seule où une fuite ne se limite pas à une mauvaise réponse texte, elle peut devenir une vraie action mal attribuée entre deux entreprises.