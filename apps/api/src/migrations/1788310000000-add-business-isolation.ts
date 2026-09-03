import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessIsolation1788310000000 implements MigrationInterface {
  name = 'AddBusinessIsolation1788310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "businesses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" varchar NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_businesses_tenantId'
        ) THEN
          ALTER TABLE "businesses"
          ADD CONSTRAINT "FK_businesses_tenantId"
          FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_businesses_tenantId_isDefault"
      ON "businesses" ("tenantId", "isDefault");
    `);

    // Add businessId columns and scope to knowledge documents
    const businessTables = [
      'agents',
      'agent_memories',
      'agent_workflows',
      'pending_actions',
      'agent_feedback',
      'conversations',
      'chat_flows',
      'knowledge_documents',
      'leads',
      'lead_comments',
      'products',
      'quotes',
      'site_configs',
      'surveys',
    ];
    for (const table of businessTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "businessId" uuid`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "knowledge_documents"
      ADD COLUMN IF NOT EXISTS "scope" varchar NOT NULL DEFAULT 'agent';
    `);

    // Create one default business per existing tenant, seeded from agents
    await queryRunner.query(`
      INSERT INTO "businesses" ("id", "tenantId", "name", "isDefault")
      SELECT uuid_generate_v4(), t.id, 'Default business', true
      FROM "tenants" t
      WHERE NOT EXISTS (
        SELECT 1 FROM "businesses" b
        WHERE b."tenantId"::text = t.id::text AND b."isDefault" = true
      );
    `);

    // Link every agent to the default business of its tenant
    await queryRunner.query(`
      UPDATE "agents" a
      SET "businessId" = b.id
      FROM "businesses" b
      WHERE a."businessId" IS NULL
        AND b."tenantId"::text = a."tenantId"::text
        AND b."isDefault" = true;
    `);

    // Helper: propagate agent.businessId to all agent-bearing tables
    const agentTables = [
      { table: 'products', fk: 'agentId' },
      { table: 'knowledge_documents', fk: 'agentId' },
      { table: 'leads', fk: 'agentId' },
      { table: 'agent_memories', fk: 'agentId' },
      { table: 'conversations', fk: 'agentId' },
      { table: 'pending_actions', fk: 'agentId' },
      { table: 'site_configs', fk: 'agentId' },
      { table: 'surveys', fk: 'agentId' },
      { table: 'chat_flows', fk: 'agentId' },
      { table: 'agent_workflows', fk: 'agentId' },
      { table: 'agent_feedback', fk: 'agentId' },
    ];
    for (const { table, fk } of agentTables) {
      await queryRunner.query(`
        UPDATE "${table}" t
        SET "businessId" = a."businessId"
        FROM "agents" a
        WHERE t."businessId" IS NULL
          AND a.id::text = t."${fk}"::text
          AND a."businessId" IS NOT NULL;
      `);
    }

    // Knowledge scope mapping: shared=true -> business, everything else -> agent
    await queryRunner.query(`
      UPDATE "knowledge_documents" kd
      SET "scope" = CASE
        WHEN kd."shared" = true THEN 'business'
        ELSE 'agent'
      END
      WHERE kd."scope" = 'agent';
    `);

    // Fill remaining rows (no agent, or null agentId) with the tenant default business
    for (const table of businessTables) {
      await queryRunner.query(`
        UPDATE "${table}" t
        SET "businessId" = b.id
        FROM "businesses" b
        WHERE t."businessId" IS NULL
          AND b."tenantId"::text = t."tenantId"::text
          AND b."isDefault" = true;
      `);
    }

    // Quotes derive their business from the linked lead where possible
    await queryRunner.query(`
      UPDATE "quotes" q
      SET "businessId" = l."businessId"
      FROM "leads" l
      WHERE q."businessId" IS NULL
        AND q."leadId"::text = l.id::text
        AND l."businessId" IS NOT NULL;
    `);
    await queryRunner.query(`
      UPDATE "quotes" q
      SET "businessId" = b.id
      FROM "businesses" b
      WHERE q."businessId" IS NULL
        AND b."tenantId"::text = q."tenantId"::text
        AND b."isDefault" = true;
    `);

    // Lead comments derive their business from the linked lead
    await queryRunner.query(`
      UPDATE "lead_comments" lc
      SET "businessId" = l."businessId"
      FROM "leads" l
      WHERE lc."businessId" IS NULL
        AND lc."leadId"::text = l.id::text
        AND l."businessId" IS NOT NULL;
    `);

    // Composite indexes for LLM-context lookups
    const indexes = [
      ['agents', ['tenantId', 'businessId']],
      ['knowledge_documents', ['tenantId', 'businessId', 'agentId']],
      ['products', ['tenantId', 'businessId', 'agentId']],
      ['leads', ['tenantId', 'businessId', 'agentId']],
      ['agent_memories', ['tenantId', 'businessId', 'agentId']],
      ['conversations', ['tenantId', 'businessId', 'agentId']],
      ['pending_actions', ['tenantId', 'businessId', 'agentId']],
      ['agent_workflows', ['tenantId', 'businessId', 'agentId']],
      ['agent_feedback', ['tenantId', 'businessId', 'agentId']],
      ['chat_flows', ['tenantId', 'businessId', 'agentId']],
      ['site_configs', ['tenantId', 'businessId', 'agentId']],
      ['surveys', ['tenantId', 'businessId', 'agentId']],
      ['quotes', ['tenantId', 'businessId']],
      ['lead_comments', ['tenantId', 'businessId']],
    ] as [string, string[]][];

    for (const [table, columns] of indexes) {
      const indexName = `IDX_${table}_${columns.join('_')}`;
      const colSql = columns.map((c) => `"${c}"`).join(', ');
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (${colSql});`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropBusinessTables = [
      'agents',
      'agent_memories',
      'agent_workflows',
      'pending_actions',
      'agent_feedback',
      'conversations',
      'chat_flows',
      'knowledge_documents',
      'leads',
      'lead_comments',
      'products',
      'quotes',
      'site_configs',
      'surveys',
    ];
    for (const table of dropBusinessTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "businessId"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "knowledge_documents" DROP COLUMN IF EXISTS "scope"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "businesses" CASCADE`);
  }
}
