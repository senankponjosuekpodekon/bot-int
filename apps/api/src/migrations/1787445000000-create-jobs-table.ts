import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobsTable1787445000000 implements MigrationInterface {
  name = 'CreateJobsTable1787445000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" character varying,
        "queue" character varying NOT NULL,
        "name" character varying NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "delayMs" integer NOT NULL DEFAULT 0,
        "availableAt" timestamp with time zone,
        "startedAt" timestamp with time zone,
        "completedAt" timestamp with time zone,
        "failedAt" timestamp with time zone,
        "error" text,
        "status" character varying NOT NULL DEFAULT 'pending',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_jobs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_status_available"
      ON "jobs" ("status", "availableAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_tenant"
      ON "jobs" ("tenantId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "jobs" CASCADE`);
  }
}
