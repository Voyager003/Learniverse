import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  async enroll(
    @Req() req: { user: RequestUser },
    @Body() dto: CreateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentsService.enroll(
      req.user.userId,
      dto,
    );
    return EnrollmentResponseDto.from(enrollment);
  }

  @Get('my')
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
