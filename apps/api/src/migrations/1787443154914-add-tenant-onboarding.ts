import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantOnboarding1787443154914 implements MigrationInterface {
  name = 'AddTenantOnboarding1787443154914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('tenants');
    if (!hasTable) return;
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "language" character varying,
      ADD COLUMN IF NOT EXISTS "timezone" character varying,
      ADD COLUMN IF NOT EXISTS "location" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      DROP COLUMN IF EXISTS "location",
      DROP COLUMN IF EXISTS "timezone",
      DROP COLUMN IF EXISTS "language"
    `);
  }
}
