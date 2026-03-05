import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export const IDEMPOTENCY_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

export type IdempotencyStatus =
  (typeof IDEMPOTENCY_STATUS)[keyof typeof IDEMPOTENCY_STATUS];

@Entity('idempotency_keys')
@Unique('UQ_idempotency_scope_key', ['userId', 'method', 'path', 'key'])
@Index('IDX_idempotency_expires_at', ['expiresAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 10 })
  method: string;

  @Column({ length: 255 })
  path: string;

  @Column({ name: 'idempotency_key', length: 255 })
  key: string;

  @Column({ name: 'request_hash', length: 64 })
  requestHash: string;

  @Column({ length: 20, default: IDEMPOTENCY_STATUS.PROCESSING })
  status: IdempotencyStatus = IDEMPOTENCY_STATUS.PROCESSING;

  @Column({ name: 'response_status', type: 'int', nullable: true })
  responseStatus: number | null = null;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody: Record<string, unknown> | null = null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
