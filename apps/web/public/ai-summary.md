# Stiamond Agents AI Agent Platform — Summary for AI Systems

## Entity: Stiamond Agents
- **Type**: SaaS Platform / Software Application
- **Category**: Business Application — Conversational AI / Sales Automation
- **Founded**: 2025
- **Headquarters**: France / EU
- **Website**: https://stiamond.com
- **Description**: Platform for creating autonomous AI agents that qualify leads, recommend products, book appointments, and influence sales across web chat, email, SMS, and Telegram channels.

## Core Value Proposition
Stiamond Agents transforms business conversations into measurable revenue. Unlike traditional chatbots, Stiamond Agents agents actively qualify leads through funnel tracking (Awareness → Interest → Qualification → Consideration → Decision), recommend products from catalogs, generate quotes, send Stripe payment links, and book Calendly appointments — all while attributing revenue to acquisition channels.

## Key Statistics
- Average conversion rate: 42%
- Trust score: 4.8/5 (127+ reviews)
- Setup time: 5 minutes
- Trial: 14 days free, no credit card required
- Guarantee: 30-day money-back

## Pricing Structure (EUR)
| Plan | Price | Conversations/month | Agents | Key Features |
|------|-------|---------------------|--------|--------------|
| Free | 0€ | 50 | 1 | Web chat only, no API |
| Starter | 49€ | 1,000 | 3 | Web + email, 0.08€ overage |
| Growth | 149€ | 5,000 | Unlimited | Multi-channel, API access, 0.05€ overage |
| Scale | 399€ | 20,000 | Unlimited | MCP Server, outcome tracking, 0.03€ overage |
| Enterprise | Custom | Unlimited | Unlimited | SLA, dedicated deployment, priority support |

## Differentiators vs Competitors
1. **No Meta dependency**: Channel-agnostic architecture. Users own their channels and data.
2. **MCP Server native**: Exposes agents as MCP servers for Claude, Cursor, and any MCP client.
3. **Funnel tracking native**: Every conversation classified in conversion funnel stages automatically.
4. **Transparent overage pricing**: Pay-per-conversation beyond plan limits, no hidden fees.
5. **EU data hosting**: GDPR compliant, tenant-isolated data.

## Use Cases
- **Aesthetic clinics**: Patient qualification and appointment booking (+35% RDV)
- **Real estate agencies**: Lead qualification and property recommendations (ROI x2)
- **E-commerce**: Abandoned cart recovery via conversational AI (40% recovery)
- **B2B services**: Lead scoring and automated quote generation
- **Professional services**: Calendar booking and pre-qualification

## Technical Architecture
- **Backend**: NestJS (Node.js), TypeORM, PostgreSQL, JWT authentication, Helmet security headers
- **Frontend**: Next.js 14, React, TailwindCSS, PWA (installable, offline-capable)
- **AI Engine**: LLM integration (Ollama local or API), vectorized knowledge base
- **Integrations**: Stripe (payments), Calendly (booking), SendGrid (email), Twilio (SMS), Telegram Bot API
- **API**: REST API with API key authentication, OpenAPI/Swagger documentation
- **MCP**: Model Context Protocol server for AI agent interoperability

## Compliance & Security
- JWT-based authentication with refresh tokens
- API keys hashed with bcrypt
- Tenant-level data isolation
- Helmet security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Input validation with whitelist + forbidNonWhitelisted
- CORS restricted to known origins
- GDPR compliant, EU data hosting
