import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { IDEMPOTENCY_STATUS } from '../../common/idempotency/entities/idempotency-key.entity.js';
import type { IdempotencyStatus } from '../../common/idempotency/entities/idempotency-key.entity.js';

export class AdminIdempotencyKeyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @ApiPropertyOptional({ enum: Object.values(IDEMPOTENCY_STATUS) })
  @IsOptional()
  @IsIn(Object.values(IDEMPOTENCY_STATUS))
  status?: IdempotencyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
