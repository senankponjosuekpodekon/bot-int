import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationClientInfo1787630000004 implements MigrationInterface {
  name = 'AddConversationClientInfo1787630000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "clientInfo" JSONB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "clientInfo"`,
    );
  }
}
