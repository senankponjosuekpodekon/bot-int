import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentWorkflowsTable1787441509160 implements MigrationInterface {
  name = 'CreateAgentWorkflowsTable1787441509160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_workflows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" character varying NOT NULL,
        "agentId" character varying,
        "name" character varying NOT NULL,
        "description" text,
        "steps" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" character varying NOT NULL DEFAULT 'draft',
        "trigger" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_workflows" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_agent_workflows_tenant_status"
      ON "agent_workflows" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_agent_workflows_tenant_agent"
      ON "agent_workflows" ("tenantId", "agentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_workflows" CASCADE`);
  }
}
