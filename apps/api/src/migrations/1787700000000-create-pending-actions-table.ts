import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePendingActionsTable1787700000000 implements MigrationInterface {
  name = 'CreatePendingActionsTable1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "pending_actions_risklevel_enum" AS ENUM ('read', 'suggest', 'write', 'execute');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "pending_actions_status_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pending_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" character varying NOT NULL,
        "conversationId" character varying,
        "agentId" character varying,
        "toolName" character varying NOT NULL,
        "args" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "riskLevel" "pending_actions_risklevel_enum" NOT NULL,
        "reason" text,
        "status" "pending_actions_status_enum" NOT NULL DEFAULT 'pending',
        "resolvedBy" character varying,
        "resolvedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pending_actions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pending_actions_tenant_status"
      ON "pending_actions" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pending_actions_tenant_conversation"
      ON "pending_actions" ("tenantId", "conversationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pending_actions" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pending_actions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pending_actions_risklevel_enum"`);
  }
}
