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

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // --- Course endpoints ---

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  async create(
    @Req() req: { user: RequestUser },
    @Body() dto: CreateCourseDto,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.create(req.user.userId, dto);
    return CourseResponseDto.from(course);
  }

  @Get()
  @Public()
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

  @Get(':id')
  @Public()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.findById(id);
    return CourseResponseDto.from(course);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
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
  @Roles(Role.TUTOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.coursesService.remove(id, req.user.userId);
  }

  // --- Lecture endpoints ---

  @Post(':id/lectures')
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
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
  @Roles(Role.TUTOR, Role.ADMIN)
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
  @Roles(Role.TUTOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLecture(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lid', ParseUUIDPipe) lid: string,
  ): Promise<void> {
    await this.coursesService.removeLecture(id, lid, req.user.userId);
  }
}
