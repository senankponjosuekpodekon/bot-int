import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductAgentId1788307200000 implements MigrationInterface {
  name = 'AddProductAgentId1788307200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('products');
    if (!hasTable) return;

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "agentId" uuid
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_agentId'
        ) THEN
          ALTER TABLE "products"
          ADD CONSTRAINT "FK_products_agentId"
          FOREIGN KEY ("agentId")
          REFERENCES "agents"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP CONSTRAINT IF EXISTS "FK_products_agentId"
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "agentId"
    `);
  }
}
