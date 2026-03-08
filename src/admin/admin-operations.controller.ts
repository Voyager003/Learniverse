import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../common/decorators/admin-only.decorator.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { EnrollmentResponseDto } from '../enrollments/dto/enrollment-response.dto.js';
import { AdminEnrollmentQueryDto } from './dto/admin-enrollment-query.dto.js';
import { AdminIdempotencyKeyQueryDto } from './dto/admin-idempotency-key-query.dto.js';
import { AdminIdempotencyKeyResponseDto } from './dto/admin-idempotency-key-response.dto.js';
import { AdminOperationsService } from './admin-operations.service.js';

@ApiTags('Admin Operations')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@AdminOnly()
@Controller('admin')
export class AdminOperationsController {
  constructor(
    private readonly adminOperationsService: AdminOperationsService,
  ) {}

  @Get('enrollments')
  @ApiOperation({ summary: '관리자 수강 목록 조회' })
  @ApiResponse({ status: 200, description: '수강 목록' })
  async findAllEnrollments(
    @Query() query: AdminEnrollmentQueryDto,
  ): Promise<PaginatedResponseDto<EnrollmentResponseDto>> {
    const result = await this.adminOperationsService.findAllEnrollments(query);

    return new PaginatedResponseDto(
      EnrollmentResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('enrollments/:id')
  @ApiOperation({ summary: '관리자 수강 상세 조회' })
  @ApiResponse({ status: 200, description: '수강 상세' })
  async findEnrollmentById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.adminOperationsService.findEnrollmentById(id);
    return EnrollmentResponseDto.from(enrollment);
  }

  @Get('idempotency-keys')
  @ApiOperation({ summary: '관리자 멱등성 키 목록 조회' })
  @ApiResponse({ status: 200, description: '멱등성 키 목록' })
  async findAllIdempotencyKeys(
    @Query() query: AdminIdempotencyKeyQueryDto,
  ): Promise<PaginatedResponseDto<AdminIdempotencyKeyResponseDto>> {
    const result =
      await this.adminOperationsService.findAllIdempotencyKeys(query);

    return new PaginatedResponseDto(
      AdminIdempotencyKeyResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }
}
