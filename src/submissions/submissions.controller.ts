import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';
import { SubmissionResponseDto } from './dto/submission-response.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '../common/enums/index.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@Controller('assignments/:aid/submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  async submit(
    @Req() req: { user: RequestUser },
    @Param('aid', ParseUUIDPipe) assignmentId: string,
    @Body() dto: CreateSubmissionDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.submit(
      assignmentId,
      req.user.userId,
      dto,
    );
    return SubmissionResponseDto.from(submission);
  }

  @Get()
  async findByAssignment(
    @Req() req: { user: RequestUser },
    @Param('aid', ParseUUIDPipe) assignmentId: string,
  ): Promise<SubmissionResponseDto[]> {
    const submissions = await this.submissionsService.findByAssignment(
      assignmentId,
      req.user.userId,
      req.user.role,
    );
    return SubmissionResponseDto.fromMany(submissions);
  }

  @Post(':sid/feedback')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  async addFeedback(
    @Req() req: { user: RequestUser },
    @Param('aid', ParseUUIDPipe) assignmentId: string,
    @Param('sid') submissionId: string,
    @Body() dto: AddFeedbackDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.addFeedback(
      submissionId,
      req.user.userId,
      req.user.role,
      dto,
    );
    return SubmissionResponseDto.from(submission);
  }
}
