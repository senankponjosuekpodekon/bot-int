import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemoryMetadata1788312000000 implements MigrationInterface {
  name = 'AddMemoryMetadata1788312000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent_memories"
      ADD COLUMN IF NOT EXISTS "source" varchar NOT NULL DEFAULT 'stated',
      ADD COLUMN IF NOT EXISTS "confidence" double precision NOT NULL DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS "expiresAt" timestamptz NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent_memories"
      DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "confidence",
      DROP COLUMN IF EXISTS "expiresAt";
    `);
  }
}
