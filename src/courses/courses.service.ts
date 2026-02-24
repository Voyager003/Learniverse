import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { Lecture } from './entities/lecture.entity.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseQueryDto } from './dto/course-query.dto.js';
import { CreateLectureDto } from './dto/create-lecture.dto.js';
import { UpdateLectureDto } from './dto/update-lecture.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lecture)
    private readonly lectureRepository: Repository<Lecture>,
  ) {}

  // --- Course CRUD ---

  async create(tutorId: string, dto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create({ ...dto, tutorId });
    return this.courseRepository.save(course);
  }

  async findAll(query: CourseQueryDto): Promise<PaginatedResponseDto<Course>> {
    const { page, limit, category, difficulty } = query;

    const qb = this.courseQueryBuilder();

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
      where: { id },
      relations: ['tutor', 'lectures'],
    });

    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    return course;
  }

  async update(
    id: string,
    tutorId: string,
    dto: UpdateCourseDto,
  ): Promise<Course> {
    const course = await this.findByIdAndVerifyOwner(id, tutorId);
    Object.assign(course, dto);
    return this.courseRepository.save(course);
  }

  async remove(id: string, tutorId: string): Promise<void> {
    const course = await this.findByIdAndVerifyOwner(id, tutorId);
    await this.courseRepository.remove(course);
  }

  // --- Lecture CRUD ---

  async createLecture(
    courseId: string,
    tutorId: string,
    dto: CreateLectureDto,
  ): Promise<Lecture> {
    await this.findByIdAndVerifyOwner(courseId, tutorId);
    const lecture = this.lectureRepository.create({ ...dto, courseId });
    return this.lectureRepository.save(lecture);
  }

  async updateLecture(
    courseId: string,
    lectureId: string,
    tutorId: string,
    dto: UpdateLectureDto,
  ): Promise<Lecture> {
    await this.findByIdAndVerifyOwner(courseId, tutorId);
    const lecture = await this.findLectureOrFail(courseId, lectureId);
    Object.assign(lecture, dto);
    return this.lectureRepository.save(lecture);
  }

  async removeLecture(
    courseId: string,
    lectureId: string,
    tutorId: string,
  ): Promise<void> {
    await this.findByIdAndVerifyOwner(courseId, tutorId);
    const lecture = await this.findLectureOrFail(courseId, lectureId);
    await this.lectureRepository.remove(lecture);
  }

  // --- Private helpers ---

  private async findByIdAndVerifyOwner(
    id: string,
    tutorId: string,
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    if (course.tutorId !== tutorId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_COURSE_OWNER);
    }

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
