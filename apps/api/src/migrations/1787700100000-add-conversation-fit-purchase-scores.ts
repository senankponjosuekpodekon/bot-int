import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationFitPurchaseScores1787700100000 implements MigrationInterface {
  name = 'AddConversationFitPurchaseScores1787700100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversations"
      ADD COLUMN IF NOT EXISTS "fitScore" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "conversations"
      ADD COLUMN IF NOT EXISTS "purchaseProbability" double precision NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "conversations"
      ADD COLUMN IF NOT EXISTS "isHotLead" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "isHotLead"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "purchaseProbability"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "fitScore"`);
  }
}
