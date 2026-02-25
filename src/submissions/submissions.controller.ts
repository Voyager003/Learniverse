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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';
import { SubmissionResponseDto } from './dto/submission-response.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';
import { Role } from '../common/enums/index.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@ApiTags('Submissions')
@ApiBearerAuth()
@Controller('assignments/:aid/submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '과제 제출 (STUDENT)' })
  @ApiResponse({
    status: 201,
    description: '제출 성공',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 403, description: '미수강 또는 권한 부족' })
  @ApiResponse({ status: 409, description: '이미 제출됨' })
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
  @ApiOperation({ summary: '과제별 제출 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '제출 목록',
    type: [SubmissionResponseDto],
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
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
  @ApiOperation({ summary: '피드백 추가 (TUTOR, ADMIN)' })
  @ApiResponse({
    status: 201,
    description: '피드백 성공',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '제출 없음' })
  @ApiResponse({ status: 409, description: '이미 리뷰됨' })
  async addFeedback(
    @Req() req: { user: RequestUser },
    @Param('aid', ParseUUIDPipe) assignmentId: string,
    @Param('sid', ParseMongoIdPipe) submissionId: string,
    @Body() dto: AddFeedbackDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.addFeedback(
      submissionId,
      assignmentId,
      req.user.userId,
      req.user.role,
      dto,
    );
    return SubmissionResponseDto.from(submission);
  }
}
