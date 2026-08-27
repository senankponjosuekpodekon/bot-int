import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationContextSummary1787630000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('conversations');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('conversations', 'contextSummary');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN "contextSummary" text`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('conversations');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('conversations', 'contextSummary');
    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "contextSummary"`);
    }
  }
}
