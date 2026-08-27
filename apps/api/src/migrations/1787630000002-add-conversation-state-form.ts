import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationStateForm1787630000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('conversations');
    if (!hasTable) return;

    const hasState = await queryRunner.hasColumn('conversations', 'state');
    const hasFormState = await queryRunner.hasColumn('conversations', 'formState');

    if (!hasState) {
      await queryRunner.query(`CREATE TYPE "conversations_state_enum" AS ENUM ('greeting', 'collecting', 'answering', 'handed_off', 'closed')`);
      await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN "state" "conversations_state_enum" DEFAULT 'answering'`);
    }
    if (!hasFormState) {
      await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN "formState" jsonb`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('conversations');
    if (!hasTable) return;

    const hasFormState = await queryRunner.hasColumn('conversations', 'formState');
    const hasState = await queryRunner.hasColumn('conversations', 'state');

    if (hasFormState) {
      await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "formState"`);
    }
    if (hasState) {
      await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "state"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "conversations_state_enum"`);
    }
  }
}
