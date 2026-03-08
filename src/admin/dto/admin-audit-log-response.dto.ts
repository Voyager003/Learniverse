import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminAuditLog } from '../entities/admin-audit-log.entity.js';

export class AdminAuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  resourceType: string;

  @ApiPropertyOptional()
  resourceId: string | null;

  @ApiPropertyOptional()
  beforeState: Record<string, unknown> | null;

  @ApiPropertyOptional()
  afterState: Record<string, unknown> | null;

  @ApiPropertyOptional()
  metadata: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  static from(entity: AdminAuditLog): AdminAuditLogResponseDto {
    const dto = new AdminAuditLogResponseDto();
    dto.id = entity.id;
    dto.actorId = entity.actorId;
    dto.action = entity.action;
    dto.resourceType = entity.resourceType;
    dto.resourceId = entity.resourceId;
    dto.beforeState = entity.beforeState;
    dto.afterState = entity.afterState;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static fromMany(entities: AdminAuditLog[]): AdminAuditLogResponseDto[] {
    return entities.map((entity) => AdminAuditLogResponseDto.from(entity));
  }
}
