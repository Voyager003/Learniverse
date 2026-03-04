import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
} from '@nestjs/swagger';
import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { CourseQueryDto } from './dto/course-query.dto.js';
import { CreateLectureDto } from './dto/create-lecture.dto.js';
import { UpdateLectureDto } from './dto/update-lecture.dto.js';
import { LectureResponseDto } from './dto/lecture-response.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '../common/enums/index.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // --- Course endpoints ---

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: '강좌 생성 (TUTOR)' })
  @ApiResponse({
    status: 201,
    description: '생성 성공',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
  async create(
    @Req() req: { user: RequestUser },
    @Body() dto: CreateCourseDto,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.create(req.user.userId, dto);
    return CourseResponseDto.from(course);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: '강좌 목록 조회 (공개)' })
  @ApiResponse({ status: 200, description: '강좌 목록 (페이지네이션)' })
  async findAll(
    @Query() query: CourseQueryDto,
  ): Promise<PaginatedResponseDto<CourseResponseDto>> {
    const result = await this.coursesService.findAll(query);
    return new PaginatedResponseDto(
      CourseResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 강좌 목록 조회 (TUTOR, 공개/비공개 포함)' })
  @ApiResponse({ status: 200, description: '내 강좌 목록 (페이지네이션)' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  async findMyCourses(
    @Req() req: { user: RequestUser },
    @Query() query: CourseQueryDto,
  ): Promise<PaginatedResponseDto<CourseResponseDto>> {
    const result = await this.coursesService.findMyCourses(
      req.user.userId,
      query,
    );
    return new PaginatedResponseDto(
      CourseResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '강좌 상세 조회 (공개)' })
  @ApiResponse({
    status: 200,
    description: '강좌 정보',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 404, description: '강좌 없음' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.findById(id);
    return CourseResponseDto.from(course);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: '강좌 수정 (TUTOR)' })
  @ApiResponse({
    status: 200,
    description: '수정 성공',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '강좌 없음' })
  async update(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.update(id, req.user.userId, dto);
    return CourseResponseDto.from(course);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '강좌 삭제 (TUTOR)' })
  @ApiResponse({ status: 204, description: '삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '강좌 없음' })
  async remove(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.coursesService.remove(id, req.user.userId);
  }

  // --- Lecture endpoints ---

  @Post(':id/lectures')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: '강의 생성 (TUTOR)' })
  @ApiResponse({
    status: 201,
    description: '생성 성공',
    type: LectureResponseDto,
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '강좌 없음' })
  async createLecture(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLectureDto,
  ): Promise<LectureResponseDto> {
    const lecture = await this.coursesService.createLecture(
      id,
      req.user.userId,
      dto,
    );
    return LectureResponseDto.from(lecture);
  }

  @Patch(':id/lectures/:lid')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: '강의 수정 (TUTOR)' })
  @ApiResponse({
    status: 200,
    description: '수정 성공',
    type: LectureResponseDto,
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '강좌 또는 강의 없음' })
  async updateLecture(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lid', ParseUUIDPipe) lid: string,
    @Body() dto: UpdateLectureDto,
  ): Promise<LectureResponseDto> {
    const lecture = await this.coursesService.updateLecture(
      id,
      lid,
      req.user.userId,
      dto,
    );
    return LectureResponseDto.from(lecture);
  }

  @Delete(':id/lectures/:lid')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '강의 삭제 (TUTOR)' })
  @ApiResponse({ status: 204, description: '삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '강좌 또는 강의 없음' })
  async removeLecture(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lid', ParseUUIDPipe) lid: string,
  ): Promise<void> {
    await this.coursesService.removeLecture(id, lid, req.user.userId);
  }
}
