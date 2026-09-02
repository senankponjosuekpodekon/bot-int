import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductImportsTable1788307200001 implements MigrationInterface {
  name = 'CreateProductImportsTable1788307200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_imports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" character varying NOT NULL,
        "source" character varying(32) NOT NULL,
        "status" character varying(16) NOT NULL,
        "created" integer NOT NULL DEFAULT 0,
        "updated" integer NOT NULL DEFAULT 0,
        "errors" integer NOT NULL DEFAULT 0,
        "scanned" integer,
        "details" jsonb,
        "metadata" jsonb,
        "startedAt" timestamp NOT NULL DEFAULT now(),
        "completedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_imports" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_imports_tenantId"
      ON "product_imports" ("tenantId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_imports_startedAt"
      ON "product_imports" ("startedAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_imports" CASCADE`);
  }
}
