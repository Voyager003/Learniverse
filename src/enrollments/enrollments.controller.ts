import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
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
  ): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.enrollmentsService.findMyEnrollments(
      req.user.userId,
    );
    return EnrollmentResponseDto.fromMany(enrollments);
  }

  @Patch(':id/progress')
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
