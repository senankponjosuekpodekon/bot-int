import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationIntentLanguage1787630000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('conversations');
    if (!hasTable) return;

    const hasLanguage = await queryRunner.hasColumn('conversations', 'language');
    const hasIntent = await queryRunner.hasColumn('conversations', 'lastDetectedIntent');
    const hasConfidence = await queryRunner.hasColumn('conversations', 'lastConfidence');

    if (!hasLanguage) {
      await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN "language" character varying(5)`);
    }
    if (!hasIntent) {
      await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN "lastDetectedIntent" character varying(32)`);
    }
    if (!hasConfidence) {
      await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN "lastConfidence" real`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('conversations');
    if (!hasTable) return;

    const hasLanguage = await queryRunner.hasColumn('conversations', 'language');
    const hasIntent = await queryRunner.hasColumn('conversations', 'lastDetectedIntent');
    const hasConfidence = await queryRunner.hasColumn('conversations', 'lastConfidence');

    if (hasConfidence) {
      await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "lastConfidence"`);
    }
    if (hasIntent) {
      await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "lastDetectedIntent"`);
    }
    if (hasLanguage) {
      await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "language"`);
    }
  }
}
