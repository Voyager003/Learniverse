import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { Lecture } from './entities/lecture.entity.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseQueryDto } from './dto/course-query.dto.js';
import { CreateLectureDto } from './dto/create-lecture.dto.js';
import { UpdateLectureDto } from './dto/update-lecture.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { CourseOwnershipPolicy } from '../common/policies/course-ownership.policy.js';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lecture)
    private readonly lectureRepository: Repository<Lecture>,
    private readonly courseOwnershipPolicy: CourseOwnershipPolicy,
  ) {}

  // --- Course CRUD ---

  async create(tutorId: string, dto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create({ ...dto, tutorId });
    return this.courseRepository.save(course);
  }

  async findAll(query: CourseQueryDto): Promise<PaginatedResponseDto<Course>> {
    const { page, limit, category, difficulty } = query;

    const qb = this.courseQueryBuilder();
    this.applyPublishedFilter(qb);
    this.applyOptionalFilters(qb, category, difficulty);
    this.applyPagination(qb, page, limit);

    const [data, total] = await qb.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findMyCourses(
    tutorId: string,
    query: CourseQueryDto,
  ): Promise<PaginatedResponseDto<Course>> {
    const { page, limit, category, difficulty } = query;

    const qb = this.courseQueryBuilder();
    qb.where('course.tutorId = :tutorId', { tutorId });
    this.applyOptionalFilters(qb, category, difficulty);
    this.applyPagination(qb, page, limit);

    const [data, total] = await qb.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findById(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id, isPublished: true, isAdminHidden: false },
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
    return this.runWithinOwnedCourse(id, userId, async (course) => {
      Object.assign(course, dto);
      return this.courseRepository.save(course);
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.runWithinOwnedCourse(id, userId, async (course) => {
      await this.courseRepository.remove(course);
    });
  }

  // --- Lecture CRUD ---

  async createLecture(
    courseId: string,
    userId: string,
    dto: CreateLectureDto,
  ): Promise<Lecture> {
    return this.runWithinOwnedCourse(courseId, userId, async () => {
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
    });
  }

  async updateLecture(
    courseId: string,
    lectureId: string,
    userId: string,
    dto: UpdateLectureDto,
  ): Promise<Lecture> {
    return this.runWithinOwnedCourse(courseId, userId, async () => {
      const lecture = await this.findLectureOrFail(courseId, lectureId);
      Object.assign(lecture, dto);
      return this.lectureRepository.save(lecture);
    });
  }

  async removeLecture(
    courseId: string,
    lectureId: string,
    userId: string,
  ): Promise<void> {
    await this.runWithinOwnedCourse(courseId, userId, async () => {
      const lecture = await this.findLectureOrFail(courseId, lectureId);
      await this.lectureRepository.remove(lecture);
    });
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

    this.courseOwnershipPolicy.assertTutorOwnsCourse(course.tutorId, userId);

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

  private applyPublishedFilter(qb: SelectQueryBuilder<Course>): void {
    // Public endpoint: only show published courses
    qb.where('course.isPublished = :isPublished', { isPublished: true });
    qb.andWhere('course.isAdminHidden = :isAdminHidden', {
      isAdminHidden: false,
    });
  }

  private applyOptionalFilters(
    qb: SelectQueryBuilder<Course>,
    category?: string,
    difficulty?: string,
  ): void {
    if (category) {
      qb.andWhere('course.category = :category', { category });
    }

    if (difficulty) {
      qb.andWhere('course.difficulty = :difficulty', { difficulty });
    }
  }

  private applyPagination(
    qb: SelectQueryBuilder<Course>,
    page: number,
    limit: number,
  ): void {
    qb.orderBy('course.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
  }

  private async runWithinOwnedCourse<T>(
    courseId: string,
    userId: string,
    action: (course: Course) => Promise<T>,
  ): Promise<T> {
    const course = await this.findByIdAndVerifyOwner(courseId, userId);
    return action(course);
  }
}
