import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1787444000000 implements MigrationInterface {
  name = 'CreateSessionsTable1787444000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "tenantId" character varying NOT NULL,
        "tokenId" character varying NOT NULL,
        "expiresAt" timestamp with time zone NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sessions_tokenId" UNIQUE ("tokenId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_userId"
      ON "sessions" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions" CASCADE`);
  }
}
