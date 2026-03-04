import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentPublishColumn1741176000000 implements MigrationInterface {
  name = 'AddAssignmentPublishColumn1741176000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      DROP COLUMN IF EXISTS "is_published";
    `);
  }
}
