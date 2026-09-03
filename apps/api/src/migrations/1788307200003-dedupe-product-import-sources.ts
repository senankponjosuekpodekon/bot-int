import { MigrationInterface, QueryRunner } from 'typeorm';

export class DedupeProductImportSources1788307200003 implements MigrationInterface {
  name = 'DedupeProductImportSources1788307200003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate sitemap sources (keep the most recently updated)
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "tenantId", COALESCE("config"->>'sitemapUrl', "config"->>'id')
                 ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
               ) as rn
        FROM "product_import_sources"
        WHERE "source" = 'sitemap'
      )
      DELETE FROM "product_import_sources"
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    `);

    // Remove duplicate CSV-URL sources (keep the most recently updated)
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "tenantId", COALESCE("config"->>'csvUrl', "config"->>'id')
                 ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
               ) as rn
        FROM "product_import_sources"
        WHERE "source" = 'csv_url'
      )
      DELETE FROM "product_import_sources"
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    `);

    // Remove duplicate Google Merchant sources (keep the most recently updated)
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "tenantId", COALESCE("config"->>'agentId', "config"->>'id')
                 ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
               ) as rn
        FROM "product_import_sources"
        WHERE "source" = 'google_merchant'
      )
      DELETE FROM "product_import_sources"
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    `);

    // Unique indexes to prevent future duplicates
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_import_sources_sitemap"
      ON "product_import_sources" ("tenantId", ("config"->>'sitemapUrl'))
      WHERE "source" = 'sitemap'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_import_sources_csv_url"
      ON "product_import_sources" ("tenantId", ("config"->>'csvUrl'))
      WHERE "source" = 'csv_url'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_import_sources_google_merchant"
      ON "product_import_sources" ("tenantId", COALESCE("config"->>'agentId', "config"->>'id'))
      WHERE "source" = 'google_merchant'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_product_import_sources_sitemap"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_product_import_sources_csv_url"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_product_import_sources_google_merchant"`);
  }
}
