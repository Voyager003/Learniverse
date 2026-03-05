import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyKeys1741305600000 implements MigrationInterface {
  name = 'AddIdempotencyKeys1741305600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "method" character varying(10) NOT NULL,
        "path" character varying(255) NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "request_hash" character varying(64) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'processing',
        "response_status" integer,
        "response_body" jsonb,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_idempotency_keys_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_idempotency_keys_status" CHECK ("status" IN ('processing', 'completed')),
        CONSTRAINT "FK_idempotency_keys_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_idempotency_scope_key" UNIQUE ("user_id", "method", "path", "idempotency_key")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_idempotency_expires_at" ON "idempotency_keys" ("expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_idempotency_expires_at";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "idempotency_keys";
    `);
  }
}
