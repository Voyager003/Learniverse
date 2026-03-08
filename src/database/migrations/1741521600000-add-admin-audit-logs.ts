import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAuditLogs1741521600000 implements MigrationInterface {
  name = 'AddAdminAuditLogs1741521600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_id" uuid NOT NULL,
        "action" character varying(100) NOT NULL,
        "resource_type" character varying(50) NOT NULL,
        "resource_id" character varying(255),
        "before_state" jsonb,
        "after_state" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_audit_logs_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_actor_id" ON "admin_audit_logs" ("actor_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_created_at" ON "admin_audit_logs" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_admin_audit_logs_created_at";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_admin_audit_logs_actor_id";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "admin_audit_logs";
    `);
  }
}
