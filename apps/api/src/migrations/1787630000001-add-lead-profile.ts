import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeadProfile1787630000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('leads');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('leads', 'profile');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "profile" jsonb`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('leads');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn('leads', 'profile');
    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "profile"`);
    }
  }
}
