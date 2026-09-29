import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full-schema baseline. Only runs on a completely empty database — existing
 * deployments already have the tables (created via synchronize) and this
 * migration becomes a no-op marker so `migrationsRun` stays consistent.
 */
export class BaselineSchema1720000000000 implements MigrationInterface {
  name = 'BaselineSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants'`,
    );
    if (existing.length > 0) return; // schema already exists — baseline skipped

    const sql = `


CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;



COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';



CREATE TYPE public.agent_memories_scope_enum AS ENUM (
    'visitor',
    'lead',
    'tenant'
);



CREATE TYPE public.agent_workflows_status_enum AS ENUM (
    'draft',
    'active',
    'archived'
);



CREATE TYPE public.agents_type_enum AS ENUM (
    'sales',
    'support',
    'hr',
    'general'
);



CREATE TYPE public.conversations_acquisitionchannel_enum AS ENUM (
    'organic',
    'meta_ads',
    'google_ads',
    'direct',
    'referral',
    'email',
    'social',
    'qr_code',
    'landing_page',
    'web_chat',
    'public_link',
    'unknown'
);



CREATE TYPE public.conversations_channel_enum AS ENUM (
    'web',
    'whatsapp',
    'api',
    'email',
    'sms',
    'telegram',
    'instagram'
);



CREATE TYPE public.conversations_funnelstage_enum AS ENUM (
    'awareness',
    'interest',
    'qualification',
    'consideration',
    'decision',
    'closed_won',
    'closed_lost'
);



CREATE TYPE public.conversations_state_enum AS ENUM (
    'greeting',
    'collecting',
    'answering',
    'handed_off',
    'closed'
);



CREATE TYPE public.conversations_status_enum AS ENUM (
    'open',
    'handed_off',
    'closed'
);



CREATE TYPE public.flow_executions_status_enum AS ENUM (
    'completed',
    'failed',
    'pending'
);



CREATE TYPE public.flow_executions_triggeredby_enum AS ENUM (
    'intent',
    'manual',
    'auto'
);



CREATE TYPE public.knowledge_documents_type_enum AS ENUM (
    'pdf',
    'text',
    'url',
    'docx'
);



CREATE TYPE public.leads_status_enum AS ENUM (
    'new',
    'hot',
    'contacted',
    'qualified',
    'converted',
    'lost'
);



CREATE TYPE public.marketplace_templates_agenttype_enum AS ENUM (
    'sales',
    'support',
    'hr',
    'general'
);



CREATE TYPE public.messages_role_enum AS ENUM (
    'user',
    'assistant',
    'system'
);



CREATE TYPE public.pending_actions_risklevel_enum AS ENUM (
    'read',
    'suggest',
    'write',
    'execute'
);



CREATE TYPE public.pending_actions_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);



CREATE TYPE public.subscriptions_plan_enum AS ENUM (
    'free',
    'starter',
    'growth',
    'scale',
    'enterprise'
);



CREATE TYPE public.subscriptions_status_enum AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'free'
);



CREATE TYPE public.surveys_type_enum AS ENUM (
    'pre_purchase',
    'post_purchase'
);



CREATE TYPE public.tenants_plan_enum AS ENUM (
    'basic',
    'pro',
    'business'
);



CREATE TYPE public.users_role_enum AS ENUM (
    'super_admin',
    'admin',
    'manager',
    'operator',
    'viewer'
);





CREATE TABLE public.agent_feedback (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "agentId" uuid NOT NULL,
    "businessId" uuid,
    "userMessage" text NOT NULL,
    "originalReply" text NOT NULL,
    "correctedReply" text NOT NULL,
    reason text,
    "appliedToPrompt" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.agent_memories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "agentId" character varying,
    "businessId" uuid,
    scope public.agent_memories_scope_enum DEFAULT 'visitor'::public.agent_memories_scope_enum NOT NULL,
    "scopeId" character varying NOT NULL,
    key character varying NOT NULL,
    value text NOT NULL,
    importance double precision DEFAULT '1'::double precision NOT NULL,
    source character varying DEFAULT 'stated'::character varying NOT NULL,
    confidence double precision DEFAULT '1'::double precision NOT NULL,
    "expiresAt" timestamp with time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.agent_workflows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "agentId" character varying,
    "businessId" uuid,
    name character varying NOT NULL,
    description text,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.agent_workflows_status_enum DEFAULT 'draft'::public.agent_workflows_status_enum NOT NULL,
    trigger jsonb DEFAULT '{}'::jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.agents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "businessId" uuid,
    name character varying NOT NULL,
    type public.agents_type_enum DEFAULT 'general'::public.agents_type_enum NOT NULL,
    industry character varying,
    personality text,
    "systemPrompt" text NOT NULL,
    "iceBreakers" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "operatorId" character varying,
    "personalityConfig" jsonb DEFAULT '{}'::jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.api_keys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    name character varying NOT NULL,
    "keyHash" character varying NOT NULL,
    prefix character varying(20),
    "isActive" boolean DEFAULT true NOT NULL,
    "lastUsedAt" date,
    "totalRequests" integer DEFAULT 0 NOT NULL,
    scopes json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "userId" character varying,
    action character varying(50) NOT NULL,
    resource character varying(100) NOT NULL,
    "resourceId" character varying,
    details jsonb,
    "ipAddress" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.businesses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    profile jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.chat_flows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "agentId" character varying NOT NULL,
    "businessId" uuid,
    title character varying NOT NULL,
    description text,
    fields jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.conversation_analytics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "conversationId" character varying,
    "leadId" character varying,
    "userMessage" text NOT NULL,
    "agentReply" text NOT NULL,
    "hadKnowledge" boolean DEFAULT false NOT NULL,
    "hadProducts" boolean DEFAULT false NOT NULL,
    converted boolean DEFAULT false NOT NULL,
    "messageLength" integer DEFAULT 0 NOT NULL,
    "detectedIntent" character varying(50),
    "promptTokens" integer DEFAULT 0 NOT NULL,
    "completionTokens" integer DEFAULT 0 NOT NULL,
    "totalTokens" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "agentId" uuid NOT NULL,
    "tenantId" character varying NOT NULL,
    "businessId" uuid,
    "visitorId" character varying,
    "leadId" uuid,
    channel public.conversations_channel_enum DEFAULT 'web'::public.conversations_channel_enum NOT NULL,
    status public.conversations_status_enum DEFAULT 'open'::public.conversations_status_enum NOT NULL,
    "acquisitionChannel" public.conversations_acquisitionchannel_enum DEFAULT 'unknown'::public.conversations_acquisitionchannel_enum NOT NULL,
    "funnelStage" public.conversations_funnelstage_enum DEFAULT 'awareness'::public.conversations_funnelstage_enum NOT NULL,
    "intentScore" integer DEFAULT 0 NOT NULL,
    "fitScore" integer DEFAULT 0 NOT NULL,
    "purchaseProbability" double precision DEFAULT '0'::double precision NOT NULL,
    "isHotLead" boolean DEFAULT false NOT NULL,
    language character varying(5),
    "lastDetectedIntent" character varying(32),
    "lastConfidence" double precision,
    state public.conversations_state_enum DEFAULT 'answering'::public.conversations_state_enum NOT NULL,
    "formState" jsonb,
    "contextSummary" text,
    "utmParams" jsonb DEFAULT '{}'::jsonb,
    "referrerUrl" character varying,
    "landingPageUrl" character varying,
    "stageHistory" text,
    "clientInfo" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.flow_executions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "flowId" character varying NOT NULL,
    "agentId" character varying NOT NULL,
    "conversationId" character varying,
    status public.flow_executions_status_enum DEFAULT 'completed'::public.flow_executions_status_enum NOT NULL,
    "triggeredBy" public.flow_executions_triggeredby_enum DEFAULT 'manual'::public.flow_executions_triggeredby_enum NOT NULL,
    input jsonb NOT NULL,
    output jsonb,
    "errorMessage" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.integrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    type character varying(50) NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.intelligence_insights (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    type character varying(30) NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    confidence double precision DEFAULT '0'::double precision NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying,
    queue character varying NOT NULL,
    name character varying NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "delayMs" integer DEFAULT 0 NOT NULL,
    "availableAt" timestamp with time zone,
    "startedAt" timestamp with time zone,
    "completedAt" timestamp with time zone,
    "failedAt" timestamp with time zone,
    error text,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.knowledge_chunks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "documentId" uuid NOT NULL,
    content text NOT NULL,
    embedding text,
    "chunkIndex" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.knowledge_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    type public.knowledge_documents_type_enum NOT NULL,
    "sourceUrl" character varying,
    filename character varying,
    content text NOT NULL,
    "embeddingId" character varying,
    "agentId" character varying,
    shared boolean DEFAULT true NOT NULL,
    "businessId" uuid,
    scope character varying DEFAULT 'agent'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.lead_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "leadId" uuid NOT NULL,
    "tenantId" character varying NOT NULL,
    "businessId" uuid,
    "authorId" character varying NOT NULL,
    "authorName" character varying NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.leads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying,
    phone character varying,
    email character varying,
    score integer DEFAULT 0 NOT NULL,
    status public.leads_status_enum DEFAULT 'new'::public.leads_status_enum NOT NULL,
    source character varying,
    "agentId" character varying,
    "businessId" uuid,
    metadata jsonb,
    tags text,
    profile jsonb,
    company character varying,
    notes character varying,
    notified boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.marketplace_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description text,
    category character varying,
    industry character varying,
    "agentType" public.marketplace_templates_agenttype_enum DEFAULT 'general'::public.marketplace_templates_agenttype_enum NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    "sourceAgentId" character varying,
    "systemPrompt" text NOT NULL,
    personality text,
    "personalityConfig" jsonb,
    "iceBreakers" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "conversationId" uuid NOT NULL,
    role public.messages_role_enum NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.pending_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "conversationId" character varying,
    "agentId" character varying,
    "businessId" uuid,
    "toolName" character varying NOT NULL,
    args jsonb DEFAULT '{}'::jsonb NOT NULL,
    "riskLevel" public.pending_actions_risklevel_enum NOT NULL,
    reason text,
    status public.pending_actions_status_enum DEFAULT 'pending'::public.pending_actions_status_enum NOT NULL,
    "resolvedBy" character varying,
    "resolvedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.platform_insights (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "metricType" character varying(40) NOT NULL,
    "metricKey" character varying(100) NOT NULL,
    value double precision DEFAULT '0'::double precision NOT NULL,
    "sampleCount" integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.product_import_sources (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    source character varying(32) NOT NULL,
    config jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "lastImportAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.product_imports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    source character varying(32) NOT NULL,
    status character varying(16) NOT NULL,
    created integer DEFAULT 0 NOT NULL,
    updated integer DEFAULT 0 NOT NULL,
    errors integer DEFAULT 0 NOT NULL,
    scanned integer,
    details jsonb,
    metadata jsonb,
    "startedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "completedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "agentId" uuid,
    "businessId" uuid,
    name character varying NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    sku character varying,
    category character varying,
    "imageUrl" character varying,
    "productUrl" character varying,
    metadata jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.quotes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "businessId" uuid,
    "leadId" character varying,
    "quoteNumber" character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "customerName" character varying NOT NULL,
    "customerEmail" character varying,
    "customerPhone" character varying,
    "customerCompany" character varying,
    items jsonb NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    "taxRate" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "taxAmount" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    notes text,
    "validUntil" date,
    "pdfPath" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tokenId" character varying NOT NULL,
    "userId" uuid NOT NULL,
    "tenantId" character varying NOT NULL,
    "hashedToken" character varying NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "isRevoked" boolean DEFAULT false NOT NULL,
    device character varying,
    "revokedAt" timestamp with time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    "tenantId" character varying NOT NULL,
    "tokenId" character varying NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.site_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "agentId" uuid,
    "businessId" uuid,
    slug character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "businessName" character varying DEFAULT ''::character varying NOT NULL,
    tagline text,
    "aboutText" text,
    "logoUrl" character varying,
    "coverImageUrl" character varying,
    contact jsonb DEFAULT '{}'::jsonb,
    "socialLinks" jsonb DEFAULT '[]'::jsonb,
    theme jsonb DEFAULT '{}'::jsonb,
    sections jsonb DEFAULT '{}'::jsonb,
    faqs jsonb DEFAULT '[]'::jsonb,
    "customDomain" character varying,
    subdomain character varying,
    "domainVerified" boolean DEFAULT false NOT NULL,
    seo jsonb DEFAULT '{}'::jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    plan public.subscriptions_plan_enum DEFAULT 'starter'::public.subscriptions_plan_enum NOT NULL,
    status public.subscriptions_status_enum DEFAULT 'trialing'::public.subscriptions_status_enum NOT NULL,
    "stripeCustomerId" character varying,
    "stripeSubscriptionId" character varying,
    "stripePriceId" character varying,
    "trialEndsAt" date,
    "currentPeriodStart" date,
    "currentPeriodEnd" date,
    "canceledAt" date,
    "conversationsThisMonth" integer DEFAULT 0 NOT NULL,
    "overageConversations" integer DEFAULT 0 NOT NULL,
    "meteringResetAt" date,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.survey_responses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "surveyId" uuid NOT NULL,
    "leadId" character varying,
    "visitorId" character varying,
    "conversationId" character varying,
    answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    source character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.surveys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "agentId" uuid,
    "businessId" uuid,
    title character varying NOT NULL,
    description text,
    type public.surveys_type_enum DEFAULT 'pre_purchase'::public.surveys_type_enum NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "triggerConfig" jsonb DEFAULT '{}'::jsonb,
    "responseCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.tenants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    plan public.tenants_plan_enum DEFAULT 'basic'::public.tenants_plan_enum NOT NULL,
    language character varying,
    timezone character varying,
    location character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    role public.users_role_enum DEFAULT 'manager'::public.users_role_enum NOT NULL,
    "tenantId" uuid NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.webhook_endpoints (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    url character varying NOT NULL,
    events text[] NOT NULL,
    secret text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);



ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT "PK_054c4cfb95223732f5939d2d546" PRIMARY KEY (id);



ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);



ALTER TABLE ONLY public.lead_comments
    ADD CONSTRAINT "PK_0b6403ed412acdd7f84f74f992c" PRIMARY KEY (id);



ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY (id);



ALTER TABLE ONLY public.surveys
    ADD CONSTRAINT "PK_1b5e3d4aaeb2321ffa98498c971" PRIMARY KEY (id);



ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);



ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY (id);



ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT "PK_349995c51959d139d8e485a58ea" PRIMARY KEY (id);



ALTER TABLE ONLY public.flow_executions
    ADD CONSTRAINT "PK_3f6404db5c4ffc05cc0564fbe8d" PRIMARY KEY (id);



ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT "PK_402a3c43fb263aa5289670e4e21" PRIMARY KEY (id);



ALTER TABLE ONLY public.chat_flows
    ADD CONSTRAINT "PK_4f6f90e0ffbe434724f2a3a2145" PRIMARY KEY (id);



ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY (id);



ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY (id);



ALTER TABLE ONLY public.marketplace_templates
    ADD CONSTRAINT "PK_6de3fac9de3002beec35828aa6f" PRIMARY KEY (id);



ALTER TABLE ONLY public.agent_workflows
    ADD CONSTRAINT "PK_76cc33610698dc1e9c50487c74c" PRIMARY KEY (id);



ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);



ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT "PK_81af684d79d321813c41019a5cd" PRIMARY KEY (id);



ALTER TABLE ONLY public.intelligence_insights
    ADD CONSTRAINT "PK_870ddff0afc4d8540186262b15f" PRIMARY KEY (id);



ALTER TABLE ONLY public.product_import_sources
    ADD CONSTRAINT "PK_8eb324db33d2462557ffb1ea5a8" PRIMARY KEY (id);



ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY (id);



ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT "PK_9adcdc6d6f3922535361ce641e8" PRIMARY KEY (id);



ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY (id);



ALTER TABLE ONLY public.conversation_analytics
    ADD CONSTRAINT "PK_9d0716e93fa6410f66ef2555f30" PRIMARY KEY (id);



ALTER TABLE ONLY public.product_imports
    ADD CONSTRAINT "PK_a02a4bd96cc40b9480f4ae9c4a0" PRIMARY KEY (id);



ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);



ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY (id);



ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT "PK_bc1bf63498dd2368ce3dc8686e8" PRIMARY KEY (id);



ALTER TABLE ONLY public.agent_memories
    ADD CONSTRAINT "PK_be7665f602a4da3907855e5f0c9" PRIMARY KEY (id);



ALTER TABLE ONLY public.site_configs
    ADD CONSTRAINT "PK_c86c7cb6e191b2ce1edb4e58fa4" PRIMARY KEY (id);



ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY (id);



ALTER TABLE ONLY public.pending_actions
    ADD CONSTRAINT "PK_ce4a91f62be035bef4054e35fde" PRIMARY KEY (id);



ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY (id);



ALTER TABLE ONLY public.agent_feedback
    ADD CONSTRAINT "PK_d07bdf8f40aceeefa3f588cf927" PRIMARY KEY (id);



ALTER TABLE ONLY public.platform_insights
    ADD CONSTRAINT "PK_e5916c9768594c365abe952c9b5" PRIMARY KEY (id);



ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY (id);



ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "UQ_155c343439adc83ada6ee3f48be" UNIQUE (email);



ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "UQ_2ff4cde633a326e804c58e7c777" UNIQUE ("tokenId");



ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "UQ_32731f181236a46182a38c992a8" UNIQUE (name);



ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "UQ_48064cd66bef5bbbcc3eb196229" UNIQUE ("tokenId");



ALTER TABLE ONLY public.site_configs
    ADD CONSTRAINT "UQ_6a7d6ff0e8af112585d7f73ac05" UNIQUE (slug);



ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);



ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT "UQ_a3cfb26a07c0ac65bd019e9bc50" UNIQUE ("quoteNumber");



CREATE INDEX "IDX_00a60ab6e6ad451eb64d846616" ON public.agent_memories USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_082cd391775a0df380bbaf705d" ON public.marketplace_templates USING btree (industry);



CREATE INDEX "IDX_0c5fe8e5f9f4dd4a8c0134abc9" ON public.subscriptions USING btree ("tenantId");



CREATE INDEX "IDX_0ef3a4a6235be96e4b8ed9bf8b" ON public.conversations USING btree ("tenantId", "createdAt");



CREATE INDEX "IDX_0f9ce67af6334adfe7a3cb914c" ON public.businesses USING btree ("tenantId", "isDefault");



CREATE INDEX "IDX_122e790482e653ee8c9b801aab" ON public.conversations USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_1ba00dced8e03677604c2687da" ON public.jobs USING btree (status, "availableAt");



CREATE INDEX "IDX_1fb71b648235b3a8cbc1727fe1" ON public.conversations USING btree ("tenantId", "acquisitionChannel");



CREATE INDEX "IDX_21e3b3fbff08150cf3e814872e" ON public.flow_executions USING btree ("tenantId", "createdAt");



CREATE INDEX "IDX_25b7b7ae9bf105dca2afad941e" ON public.surveys USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_272e0d2fc253f040969f606d34" ON public.agent_memories USING btree ("tenantId", scope, "scopeId");



CREATE INDEX "IDX_2cd545077d6e6e8378b051cf1b" ON public.api_keys USING btree ("tenantId");



CREATE INDEX "IDX_4b9987a15c48825e7ecd6a61b4" ON public.knowledge_documents USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_536218cb24680414da36e337b1" ON public.agent_feedback USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_564f0c6fba32a17d204a23e947" ON public.pending_actions USING btree ("tenantId", status);



CREATE INDEX "IDX_57de40bc620f456c7311aa3a1e" ON public.sessions USING btree ("userId");



CREATE INDEX "IDX_57f1d86c597a8c957f5ebf3e93" ON public.flow_executions USING btree ("tenantId", "flowId");



CREATE INDEX "IDX_5d5fec68a5166994550158a720" ON public.products USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_6470439b5eaeab7bb8d1207f77" ON public.agent_workflows USING btree ("tenantId", "agentId");



CREATE INDEX "IDX_66a9e52dfa55c1666860e8c517" ON public.marketplace_templates USING btree (category);



CREATE INDEX "IDX_69e2e77a748c9e1f0ff00a976c" ON public.agent_memories USING btree ("tenantId", "agentId");



CREATE INDEX "IDX_807994ae5cd2699bf15832114e" ON public.audit_logs USING btree ("tenantId", action);



CREATE INDEX "IDX_816a456de4415f5c501e0927d0" ON public.conversations USING btree ("agentId", "visitorId");



CREATE INDEX "IDX_8231b5f5f898c6608094a5553b" ON public.jobs USING btree ("tenantId");



CREATE INDEX "IDX_8af7fe6515f686ce9b7f253296" ON public.site_configs USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_94dde58d7fe14f2759c1fe8b4a" ON public.pending_actions USING btree ("tenantId", "conversationId");



CREATE INDEX "IDX_97ac7c0a53b3c1efb55097cdd6" ON public.quotes USING btree ("tenantId", "businessId");



CREATE INDEX "IDX_a57603c92e930f22cbf6a9db4a" ON public.webhook_endpoints USING btree ("tenantId", "isActive");



CREATE INDEX "IDX_b44fafc7a5bb71a4d9af6a7e60" ON public.agent_workflows USING btree ("tenantId", status);



CREATE INDEX "IDX_d169c4bc1df120f789255c8996" ON public.lead_comments USING btree ("tenantId", "businessId");



CREATE INDEX "IDX_dd5401fcd46b93c61e7e0075d5" ON public.conversations USING btree ("tenantId", "funnelStage");



CREATE UNIQUE INDEX "IDX_df3b25181df0b4b59bd93f16e1" ON public.api_keys USING btree ("keyHash");



CREATE INDEX "IDX_e7193631ed48944a0efe596641" ON public.pending_actions USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_e731317631968298fc192ff9f2" ON public.lead_comments USING btree ("leadId", "createdAt");



CREATE INDEX "IDX_e795317feb388c94cb17c0f855" ON public.conversations USING btree ("tenantId", status);



CREATE INDEX "IDX_e955147e88d8e55835f8526581" ON public.leads USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_ed042192a195b8288d2f7de893" ON public.chat_flows USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_f03e4eee2ee21627ed2a71dc17" ON public.agents USING btree ("tenantId", "businessId");



CREATE INDEX "IDX_f09b40d69c2488932373effd4e" ON public.audit_logs USING btree ("tenantId", "createdAt");



CREATE INDEX "IDX_f9d8e0ac8eec54c52736eca052" ON public.agent_workflows USING btree ("tenantId", "businessId", "agentId");



CREATE INDEX "IDX_messages_conversationId_createdAt" ON public.messages USING btree ("conversationId", "createdAt");



ALTER TABLE ONLY public.chat_flows
    ADD CONSTRAINT "FK_0153145a40127ac03436ff1abdb" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.agent_feedback
    ADD CONSTRAINT "FK_01c3bda91eae0bad5b91f9d592f" FOREIGN KEY ("agentId") REFERENCES public.agents(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.site_configs
    ADD CONSTRAINT "FK_0984d1f510af261c403ec4a3e8b" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT "FK_25808cd05336ffe2df9ce8ac832" FOREIGN KEY ("documentId") REFERENCES public.knowledge_documents(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "FK_32a5f153b0a604e7c863f5d41f2" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_359bd8406fbfb50e3ea42b5631f" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "FK_388079d7d4e52de7d14a939303a" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.surveys
    ADD CONSTRAINT "FK_4ad5cdbe0399ea456565e9ac991" FOREIGN KEY ("agentId") REFERENCES public.agents(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "FK_67c032446764c64c0ace9b71cd8" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_6804855ba1a19523ea57e0769b4" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "FK_6bc9cd21e9dad29f3de7b6da4d9" FOREIGN KEY ("agentId") REFERENCES public.agents(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_7792066b6c313bacefb7ce35efb" FOREIGN KEY ("agentId") REFERENCES public.agents(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.site_configs
    ADD CONSTRAINT "FK_93734f33397e7bdf7beff1c9aac" FOREIGN KEY ("agentId") REFERENCES public.agents(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.agent_feedback
    ADD CONSTRAINT "FK_a0ea3b5e97c30dbd8b3aa481e0d" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT "FK_b1b8e9ffc45eb9c2bfd32090242" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT "FK_b4665dae8c6382887a19ff022ef" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "FK_b5d372950b9ca5c5c1bf01a6561" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.agent_memories
    ADD CONSTRAINT "FK_c0fa83971a230dc3de53253cc22" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.pending_actions
    ADD CONSTRAINT "FK_c102440aeea58dc1b40901e91f0" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_c58f7e88c286e5e3478960a998b" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.lead_comments
    ADD CONSTRAINT "FK_c5f1b40dfce0729854b2f7497e0" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.surveys
    ADD CONSTRAINT "FK_c8b08348006a523cf8867b8d0f4" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT "FK_cbd320a6153895647c951ab056c" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.survey_responses
    ADD CONSTRAINT "FK_ce01227f38da9eedae96f1f4c06" FOREIGN KEY ("surveyId") REFERENCES public.surveys(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT "FK_d5136ed0fb1aa83f4c093f237d6" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "FK_daf8eb3d52d018ea43df6d5edab" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.lead_comments
    ADD CONSTRAINT "FK_e5809155caa4e12b8e39ae42b53" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "FK_f8a34fe7a504acf2c10ba478a5b" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.agent_workflows
    ADD CONSTRAINT "FK_fd5a563ad2fc0e2f9e6d6533f8b" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE SET NULL;

-- pgvector: extension + typed embedding column (see pgvector-migration.sql history)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_vector
ON knowledge_chunks USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);
`;
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants'`,
    );
    if (existing.length === 0) return;
    await queryRunner.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
}
