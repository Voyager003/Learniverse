import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdempotencyKey } from '../../common/idempotency/entities/idempotency-key.entity.js';
import type { IdempotencyStatus } from '../../common/idempotency/entities/idempotency-key.entity.js';

export class AdminIdempotencyKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  path: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  status: IdempotencyStatus;

  @ApiPropertyOptional()
  responseStatus: number | null;

  @ApiPropertyOptional()
  responseBody: Record<string, unknown> | null;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(record: IdempotencyKey): AdminIdempotencyKeyResponseDto {
    const dto = new AdminIdempotencyKeyResponseDto();
    dto.id = record.id;
    dto.userId = record.userId;
    dto.method = record.method;
    dto.path = record.path;
    dto.key = record.key;
    dto.status = record.status;
    dto.responseStatus = record.responseStatus;
    dto.responseBody = record.responseBody;
    dto.expiresAt = record.expiresAt;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }

  static fromMany(records: IdempotencyKey[]): AdminIdempotencyKeyResponseDto[] {
    return records.map((record) => AdminIdempotencyKeyResponseDto.from(record));
  }
}
