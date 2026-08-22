import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentIndustry1787442543386 implements MigrationInterface {
  name = 'AddAgentIndustry1787442543386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agents"
      ADD COLUMN IF NOT EXISTS "industry" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agents"
      DROP COLUMN IF EXISTS "industry"
    `);
  }
}
