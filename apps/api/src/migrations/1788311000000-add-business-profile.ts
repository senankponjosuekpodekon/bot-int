import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessProfile1788311000000 implements MigrationInterface {
  name = 'AddBusinessProfile1788311000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "businesses"
      ADD COLUMN IF NOT EXISTS "profile" jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "businesses" DROP COLUMN IF EXISTS "profile";
    `);
  }
}
