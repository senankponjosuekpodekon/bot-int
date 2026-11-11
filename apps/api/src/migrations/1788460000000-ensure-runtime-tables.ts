import { MigrationInterface, QueryRunner } from 'typeorm';

// Ensures tables that are missing or drifted on some databases
// (prod returned 500 on /api/flows, /api/webhooks, /api/marketplace/templates).
// Everything here is idempotent: CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
export class EnsureRuntimeTables1788460000000 implements MigrationInterface {
  name = 'EnsureRuntimeTables1788460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enum types ───
    for (const ddl of [
      `CREATE TYPE public.marketplace_templates_agenttype_enum AS ENUM ('sales','support','hr','general')`,
      `CREATE TYPE public.flow_executions_status_enum AS ENUM ('completed','failed','pending')`,
      `CREATE TYPE public.flow_executions_triggeredby_enum AS ENUM ('intent','manual','auto')`,
    ]) {
      await queryRunner.query(
        `DO $$ BEGIN ${ddl}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      );
    }

    // ─── Tables (full definition; no-op when they already exist) ───
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        "tenantId" uuid NOT NULL,
        url character varying NOT NULL,
        events text[] NOT NULL,
        secret text,
        "isActive" boolean DEFAULT true NOT NULL,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_webhook_endpoints" PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.chat_flows (
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
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_chat_flows" PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.flow_executions (
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
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_flow_executions" PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.marketplace_templates (
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
        "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_marketplace_templates" PRIMARY KEY (id)
      );
    `);

    // ─── Column-level drift repair (ADD COLUMN IF NOT EXISTS per entity column) ───
    const columns: [string, string, string][] = [
      ['webhook_endpoints', 'tenantId', 'uuid'],
      ['webhook_endpoints', 'url', 'character varying NOT NULL DEFAULT \'\''],
      ['webhook_endpoints', 'events', 'text[] NOT NULL DEFAULT \'{}\''],
      ['webhook_endpoints', 'secret', 'text'],
      ['webhook_endpoints', 'isActive', 'boolean NOT NULL DEFAULT true'],
      ['webhook_endpoints', 'createdAt', 'timestamp without time zone NOT NULL DEFAULT now()'],
      ['chat_flows', 'tenantId', 'character varying'],
      ['chat_flows', 'agentId', 'character varying'],
      ['chat_flows', 'businessId', 'uuid'],
      ['chat_flows', 'title', 'character varying NOT NULL DEFAULT \'\''],
      ['chat_flows', 'description', 'text'],
      ['chat_flows', 'fields', 'jsonb NOT NULL DEFAULT \'[]\'::jsonb'],
      ['chat_flows', 'actions', 'jsonb DEFAULT \'[]\'::jsonb'],
      ['chat_flows', 'isActive', 'boolean NOT NULL DEFAULT true'],
      ['chat_flows', 'createdAt', 'timestamp without time zone NOT NULL DEFAULT now()'],
      ['chat_flows', 'updatedAt', 'timestamp without time zone NOT NULL DEFAULT now()'],
      ['flow_executions', 'tenantId', 'character varying'],
      ['flow_executions', 'flowId', 'character varying'],
      ['flow_executions', 'agentId', 'character varying'],
      ['flow_executions', 'conversationId', 'character varying'],
      ['flow_executions', 'status', 'public.flow_executions_status_enum NOT NULL DEFAULT \'completed\''],
      ['flow_executions', 'triggeredBy', 'public.flow_executions_triggeredby_enum NOT NULL DEFAULT \'manual\''],
      ['flow_executions', 'input', 'jsonb NOT NULL DEFAULT \'{}\'::jsonb'],
      ['flow_executions', 'output', 'jsonb'],
      ['flow_executions', 'errorMessage', 'text'],
      ['flow_executions', 'createdAt', 'timestamp without time zone NOT NULL DEFAULT now()'],
      ['marketplace_templates', 'name', 'character varying NOT NULL DEFAULT \'\''],
      ['marketplace_templates', 'description', 'text'],
      ['marketplace_templates', 'category', 'character varying'],
      ['marketplace_templates', 'industry', 'character varying'],
      ['marketplace_templates', 'agentType', 'public.marketplace_templates_agenttype_enum NOT NULL DEFAULT \'general\''],
      ['marketplace_templates', 'isPublic', 'boolean NOT NULL DEFAULT true'],
      ['marketplace_templates', 'sourceAgentId', 'character varying'],
      ['marketplace_templates', 'systemPrompt', 'text NOT NULL DEFAULT \'\''],
      ['marketplace_templates', 'personality', 'text'],
      ['marketplace_templates', 'personalityConfig', 'jsonb'],
      ['marketplace_templates', 'iceBreakers', 'jsonb'],
      ['marketplace_templates', 'createdAt', 'timestamp without time zone NOT NULL DEFAULT now()'],
      ['marketplace_templates', 'updatedAt', 'timestamp without time zone NOT NULL DEFAULT now()'],
    ];
    for (const [table, column, type] of columns) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type};`,
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally no-op: dropping these tables would destroy data.
  }
}
