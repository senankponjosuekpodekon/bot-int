import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentAllowedDomains1788520000000 implements MigrationInterface {
  name = 'AgentAllowedDomains1788520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "allowedDomains" jsonb`,
    );
  }

  public async down(): Promise<void> {
    // no-op: keep idempotent repair style consistent with ensure-runtime-tables
  }
}
