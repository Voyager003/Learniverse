import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetAssignmentPublishDefaultTrue1741180000000 implements MigrationInterface {
  name = 'SetAssignmentPublishDefaultTrue1741180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ALTER COLUMN "is_published" SET DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ALTER COLUMN "is_published" SET DEFAULT false;
    `);
  }
}
