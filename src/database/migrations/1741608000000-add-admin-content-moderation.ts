import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminContentModeration1741608000000 implements MigrationInterface {
  name = 'AddAdminContentModeration1741608000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courses"
      ADD COLUMN IF NOT EXISTS "is_admin_hidden" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "admin_hidden_reason" text,
      ADD COLUMN IF NOT EXISTS "admin_hidden_at" TIMESTAMP;
    `);

    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD COLUMN IF NOT EXISTS "is_admin_hidden" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "admin_hidden_reason" text,
      ADD COLUMN IF NOT EXISTS "admin_hidden_at" TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      DROP COLUMN IF EXISTS "admin_hidden_at",
      DROP COLUMN IF EXISTS "admin_hidden_reason",
      DROP COLUMN IF EXISTS "is_admin_hidden";
    `);

    await queryRunner.query(`
      ALTER TABLE "courses"
      DROP COLUMN IF EXISTS "admin_hidden_at",
      DROP COLUMN IF EXISTS "admin_hidden_reason",
      DROP COLUMN IF EXISTS "is_admin_hidden";
    `);
  }
}
