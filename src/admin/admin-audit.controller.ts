import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin-only.decorator.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto.js';
import { AdminAuditLogResponseDto } from './dto/admin-audit-log-response.dto.js';
import { AdminAuditService } from './admin-audit.service.js';

@ApiTags('Admin Audit')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@AdminOnly()
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get()
  @ApiOperation({ summary: '관리자 감사 로그 목록 조회' })
  @ApiResponse({ status: 200, description: '감사 로그 목록' })
  async findAll(
    @Query() query: AdminAuditLogQueryDto,
  ): Promise<PaginatedResponseDto<AdminAuditLogResponseDto>> {
    const result = await this.adminAuditService.findAll(query);

    return new PaginatedResponseDto(
      AdminAuditLogResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }
}
