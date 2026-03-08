import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  MoreThanOrEqual,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto.js';
import { AdminAuditLog } from './entities/admin-audit-log.entity.js';

interface RecordAdminAuditInput {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly adminAuditRepository: Repository<AdminAuditLog>,
  ) {}

  async record(input: RecordAdminAuditInput): Promise<AdminAuditLog> {
    const log = this.adminAuditRepository.create({
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
      metadata: input.metadata ?? null,
    });

    return this.adminAuditRepository.save(log);
  }

  async findAll(
    query: AdminAuditLogQueryDto,
  ): Promise<PaginatedResponseDto<AdminAuditLog>> {
    const { page, limit, actorId, action, resourceType, from, to } = query;
    const where: FindOptionsWhere<AdminAuditLog> = {};

    if (actorId) {
      where.actorId = actorId;
    }

    if (action) {
      where.action = action;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (from && to) {
      where.createdAt = Between(new Date(from), new Date(to));
    } else if (from) {
      where.createdAt = MoreThanOrEqual(new Date(from));
    } else if (to) {
      where.createdAt = LessThanOrEqual(new Date(to));
    }

    const [data, total] = await this.adminAuditRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
