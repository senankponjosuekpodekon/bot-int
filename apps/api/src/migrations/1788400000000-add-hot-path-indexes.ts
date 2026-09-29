import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHotPathIndexes1788400000000 implements MigrationInterface {
  name = 'AddHotPathIndexes1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_conversationId_createdAt"
      ON "messages" ("conversationId", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_messages_conversationId_createdAt";`);
  }
}
