import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddConversationLead1721419800000 implements MigrationInterface {
  name = 'AddConversationLead1721419800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'conversations';
    const tableExists = await queryRunner.hasTable(tableName);
    if (!tableExists) {
      return;
    }

    const hasColumn = await queryRunner.hasColumn(tableName, 'leadId');
    if (!hasColumn) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({ name: 'leadId', type: 'uuid', isNullable: true }),
      );
    }

    const foreignKeys = await queryRunner.getTable(tableName);
    const exists = foreignKeys?.foreignKeys.some((fk) => fk.columnNames.includes('leadId'));
    if (!exists) {
      await queryRunner.createForeignKey(
        tableName,
        new TableForeignKey({
          columnNames: ['leadId'],
          referencedTableName: 'leads',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'conversations';
    const tableExists = await queryRunner.hasTable(tableName);
    if (!tableExists) return;

    const table = await queryRunner.getTable(tableName);
    const fk = table?.foreignKeys.find((foreignKey) => foreignKey.columnNames.includes('leadId'));
    if (fk) {
      await queryRunner.dropForeignKey(tableName, fk);
    }
    const hasColumn = await queryRunner.hasColumn(tableName, 'leadId');
    if (hasColumn) {
      await queryRunner.dropColumn(tableName, 'leadId');
    }
  }
}
