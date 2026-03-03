import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { Lecture } from './entities/lecture.entity.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseQueryDto } from './dto/course-query.dto.js';
import { CreateLectureDto } from './dto/create-lecture.dto.js';
import { UpdateLectureDto } from './dto/update-lecture.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { CourseAccessPolicy } from './policies/course-access.policy.js';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lecture)
    private readonly lectureRepository: Repository<Lecture>,
    private readonly courseAccessPolicy: CourseAccessPolicy,
  ) {}

  // --- Course CRUD ---

  async create(tutorId: string, dto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create({ ...dto, tutorId });
    return this.courseRepository.save(course);
  }

  async findAll(query: CourseQueryDto): Promise<PaginatedResponseDto<Course>> {
    const { page, limit, category, difficulty } = query;

    const qb = this.courseQueryBuilder();

    // Public endpoint: only show published courses
    qb.where('course.isPublished = :isPublished', { isPublished: true });

    if (category) {
      qb.andWhere('course.category = :category', { category });
    }

    if (difficulty) {
      qb.andWhere('course.difficulty = :difficulty', { difficulty });
    }

    qb.orderBy('course.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findById(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id, isPublished: true },
      relations: ['tutor', 'lectures'],
    });

    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    return course;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCourseDto,
  ): Promise<Course> {
    const course = await this.findByIdAndVerifyOwner(id, userId);
    Object.assign(course, dto);
    return this.courseRepository.save(course);
  }

  async remove(id: string, userId: string): Promise<void> {
    const course = await this.findByIdAndVerifyOwner(id, userId);
    await this.courseRepository.remove(course);
  }

  // --- Lecture CRUD ---

  async createLecture(
    courseId: string,
    userId: string,
    dto: CreateLectureDto,
  ): Promise<Lecture> {
    await this.findByIdAndVerifyOwner(courseId, userId);
    const lecture = this.lectureRepository.create({ ...dto, courseId });
    try {
      return await this.lectureRepository.save(lecture);
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as Record<string, unknown>)['code'] ===
          UNIQUE_VIOLATION_CODE
      ) {
        throw new ConflictException(
          `Lecture order ${dto.order} already exists in this course`,
        );
      }
      throw error;
    }
  }

  async updateLecture(
    courseId: string,
    lectureId: string,
    userId: string,
    dto: UpdateLectureDto,
  ): Promise<Lecture> {
    await this.findByIdAndVerifyOwner(courseId, userId);
    const lecture = await this.findLectureOrFail(courseId, lectureId);
    Object.assign(lecture, dto);
    return this.lectureRepository.save(lecture);
  }

  async removeLecture(
    courseId: string,
    lectureId: string,
    userId: string,
  ): Promise<void> {
    await this.findByIdAndVerifyOwner(courseId, userId);
    const lecture = await this.findLectureOrFail(courseId, lectureId);
    await this.lectureRepository.remove(lecture);
  }

  // --- Private helpers ---

  private async findByIdAndVerifyOwner(
    id: string,
    userId: string,
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    this.courseAccessPolicy.assertTutorOwnsCourse(course.tutorId, userId);

    return course;
  }

  private async findLectureOrFail(
    courseId: string,
    lectureId: string,
  ): Promise<Lecture> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId, courseId },
    });

    if (!lecture) {
      throw new NotFoundException(ERROR_MESSAGES.LECTURE_NOT_FOUND);
    }

    return lecture;
  }

  private courseQueryBuilder() {
    return this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.tutor', 'tutor');
  }
}
