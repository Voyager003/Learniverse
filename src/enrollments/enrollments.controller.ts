import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '../common/enums/index.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '수강 등록 (STUDENT)' })
  @ApiResponse({
    status: 201,
    description: '등록 성공',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({ status: 409, description: '이미 수강 중' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: '재시도 중복 처리를 위한 멱등성 키',
  })
  async enroll(
    @Req() req: { user: RequestUser },
    @Body() dto: CreateEnrollmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentsService.enroll(
      req.user.userId,
      dto,
      idempotencyKey,
    );
    return EnrollmentResponseDto.from(enrollment);
  }

  @Get('my')
  @ApiOperation({ summary: '내 수강 목록 조회' })
  @ApiResponse({ status: 200, description: '수강 목록 (페이지네이션)' })
  async findMyEnrollments(
    @Req() req: { user: RequestUser },
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<EnrollmentResponseDto>> {
    const result = await this.enrollmentsService.findMyEnrollments(
      req.user.userId,
      query,
    );
    return new PaginatedResponseDto(
      EnrollmentResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Patch(':id/progress')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '진행률 업데이트 (STUDENT)' })
  @ApiResponse({
    status: 200,
    description: '업데이트 성공',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({ status: 404, description: '수강 정보 없음' })
  async updateProgress(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentsService.updateProgress(
      id,
      req.user.userId,
      dto,
    );
    return EnrollmentResponseDto.from(enrollment);
  }
}
