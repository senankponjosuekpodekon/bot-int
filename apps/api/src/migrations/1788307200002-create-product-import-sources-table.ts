import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductImportSourcesTable1788307200002 implements MigrationInterface {
  name = 'CreateProductImportSourcesTable1788307200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_import_sources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" character varying NOT NULL,
        "source" character varying(32) NOT NULL,
        "config" jsonb NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "lastImportAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_import_sources" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_import_sources_tenantId"
      ON "product_import_sources" ("tenantId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_import_sources_source"
      ON "product_import_sources" ("source")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_import_sources" CASCADE`);
  }
}
