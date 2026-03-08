import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';
import { AdminOnly } from '../common/decorators/admin-only.decorator.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';
import { AdminContentService } from './admin-content.service.js';
import { AdminAssignmentQueryDto } from './dto/admin-assignment-query.dto.js';
import { AdminAssignmentResponseDto } from './dto/admin-assignment-response.dto.js';
import { AdminCourseQueryDto } from './dto/admin-course-query.dto.js';
import { AdminCourseResponseDto } from './dto/admin-course-response.dto.js';
import { AdminSubmissionQueryDto } from './dto/admin-submission-query.dto.js';
import { AdminSubmissionResponseDto } from './dto/admin-submission-response.dto.js';
import { UpdateAdminModerationDto } from './dto/update-admin-moderation.dto.js';

@ApiTags('Admin Content')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@AdminOnly()
@Controller('admin')
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Get('courses')
  @ApiOperation({ summary: '관리자 강좌 목록 조회' })
  @ApiResponse({ status: 200, description: '강좌 목록' })
  async findAllCourses(
    @Query() query: AdminCourseQueryDto,
  ): Promise<PaginatedResponseDto<AdminCourseResponseDto>> {
    const result = await this.adminContentService.findAllCourses(query);
    return new PaginatedResponseDto(
      AdminCourseResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('courses/:id')
  @ApiOperation({ summary: '관리자 강좌 상세 조회' })
  @ApiResponse({ status: 200, description: '강좌 상세' })
  async findCourseById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCourseResponseDto> {
    const course = await this.adminContentService.findCourseById(id);
    return AdminCourseResponseDto.from(course);
  }

  @Patch('courses/:id/moderation')
  @ApiOperation({ summary: '관리자 강좌 moderation 변경' })
  @ApiResponse({ status: 200, description: '강좌 moderation 반영' })
  async updateCourseModeration(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminModerationDto,
  ): Promise<AdminCourseResponseDto> {
    const course = await this.adminContentService.updateCourseModeration(
      req.user.userId,
      id,
      dto,
    );
    return AdminCourseResponseDto.from(course);
  }

  @Get('assignments')
  @ApiOperation({ summary: '관리자 과제 목록 조회' })
  @ApiResponse({ status: 200, description: '과제 목록' })
  async findAllAssignments(
    @Query() query: AdminAssignmentQueryDto,
  ): Promise<PaginatedResponseDto<AdminAssignmentResponseDto>> {
    const result = await this.adminContentService.findAllAssignments(query);
    return new PaginatedResponseDto(
      AdminAssignmentResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: '관리자 과제 상세 조회' })
  @ApiResponse({ status: 200, description: '과제 상세' })
  async findAssignmentById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminAssignmentResponseDto> {
    const assignment = await this.adminContentService.findAssignmentById(id);
    return AdminAssignmentResponseDto.from(assignment);
  }

  @Patch('assignments/:id/moderation')
  @ApiOperation({ summary: '관리자 과제 moderation 변경' })
  @ApiResponse({ status: 200, description: '과제 moderation 반영' })
  async updateAssignmentModeration(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminModerationDto,
  ): Promise<AdminAssignmentResponseDto> {
    const assignment =
      await this.adminContentService.updateAssignmentModeration(
        req.user.userId,
        id,
        dto,
      );
    return AdminAssignmentResponseDto.from(assignment);
  }

  @Get('submissions')
  @ApiOperation({ summary: '관리자 제출 목록 조회' })
  @ApiResponse({ status: 200, description: '제출 목록' })
  async findAllSubmissions(
    @Query() query: AdminSubmissionQueryDto,
  ): Promise<PaginatedResponseDto<AdminSubmissionResponseDto>> {
    const result = await this.adminContentService.findAllSubmissions(query);
    return new PaginatedResponseDto(
      AdminSubmissionResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: '관리자 제출 상세 조회' })
  @ApiResponse({ status: 200, description: '제출 상세' })
  async findSubmissionById(
    @Param('id', ParseMongoIdPipe) id: string,
  ): Promise<AdminSubmissionResponseDto> {
    const submission = await this.adminContentService.findSubmissionById(id);
    return AdminSubmissionResponseDto.from(submission);
  }

  @Patch('submissions/:id/moderation')
  @ApiOperation({ summary: '관리자 제출 moderation 변경' })
  @ApiResponse({ status: 200, description: '제출 moderation 반영' })
  async updateSubmissionModeration(
    @Req() req: { user: RequestUser },
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateAdminModerationDto,
  ): Promise<AdminSubmissionResponseDto> {
    const submission =
      await this.adminContentService.updateSubmissionModeration(
        req.user.userId,
        id,
        dto,
      );
    return AdminSubmissionResponseDto.from(submission);
  }
}
