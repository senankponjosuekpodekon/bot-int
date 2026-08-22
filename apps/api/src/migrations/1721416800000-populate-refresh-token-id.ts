import { randomBytes } from 'crypto';
import { MigrationInterface, QueryRunner, TableColumn, TableUnique } from 'typeorm';

export class PopulateRefreshTokenId1721416800000 implements MigrationInterface {
  name = 'PopulateRefreshTokenId1721416800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'refresh_tokens';
    const tableExists = await queryRunner.hasTable(tableName);
    if (!tableExists) {
      return;
    }

    const hasColumn = await queryRunner.hasColumn(tableName, 'tokenId');
    if (!hasColumn) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({ name: 'tokenId', type: 'varchar', isNullable: true }),
      );
    }

    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "${tableName}" WHERE "tokenId" IS NULL`,
    );

    for (const row of rows) {
      const tokenId = randomBytes(16).toString('hex');
      await queryRunner.query(`UPDATE "${tableName}" SET "tokenId" = $1 WHERE id = $2`, [
        tokenId,
        row.id,
      ]);
    }

    const table = await queryRunner.getTable(tableName);
    if (table) {
      const existingUnique = table.uniques.find((unique) =>
        unique.columnNames.includes('tokenId'),
      );
      if (!existingUnique) {
        await queryRunner.createUniqueConstraint(
          table,
          new TableUnique({ name: 'UQ_refresh_tokens_tokenId', columnNames: ['tokenId'] }),
        );
      }
    }

    await queryRunner.query(`ALTER TABLE "${tableName}" ALTER COLUMN "tokenId" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'refresh_tokens';
    const tableExists = await queryRunner.hasTable(tableName);
    if (!tableExists) return;

    await queryRunner.query(`ALTER TABLE "${tableName}" ALTER COLUMN "tokenId" DROP NOT NULL`);

    const table = await queryRunner.getTable(tableName);
    const unique = table?.uniques.find((uq) => uq.name === 'UQ_refresh_tokens_tokenId');
    if (table && unique) {
      await queryRunner.dropUniqueConstraint(table, unique);
    }
  }
}
