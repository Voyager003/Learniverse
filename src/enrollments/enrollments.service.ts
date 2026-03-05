import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { EnrollmentStatus } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';
import { IdempotencyKey } from '../common/idempotency/entities/idempotency-key.entity.js';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async enroll(
    studentId: string,
    dto: CreateEnrollmentDto,
    idempotencyKey?: string,
  ): Promise<Enrollment> {
    return this.idempotencyService.execute({
      userId: studentId,
      method: 'POST',
      path: '/api/v1/enrollments',
      key: idempotencyKey,
      payload: dto,
      run: () => this.enrollOnce(studentId, dto),
      replay: (record) => this.replayEnrollment(record),
      serializeResult: (enrollment) => ({ enrollmentId: enrollment.id }),
      successStatus: 201,
    });
  }

  private async enrollOnce(
    studentId: string,
    dto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    const course = await this.findPublishedCourseOrFail(dto.courseId);
    this.assertNotSelfEnrollment(course.tutorId, studentId);
    await this.assertNoActiveOrCompletedEnrollment(studentId, dto.courseId);

    const reactivated = await this.tryReactivateDroppedEnrollment(
      studentId,
      dto.courseId,
    );
    if (reactivated) {
      return reactivated;
    }

    return this.createEnrollmentSafely(studentId, dto.courseId);
  }

  // H-4: Paginated enrollment list
  async findMyEnrollments(
    studentId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Enrollment>> {
    const { page, limit } = query;

    const [data, total] = await this.enrollmentRepository.findAndCount({
      where: { studentId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async updateProgress(
    id: string,
    studentId: string,
    dto: UpdateProgressDto,
  ): Promise<Enrollment> {
    return this.dataSource.transaction(async (manager) => {
      const transactionalEnrollmentRepository =
        manager.getRepository(Enrollment);
      const enrollment = await transactionalEnrollmentRepository
        .createQueryBuilder('enrollment')
        .setLock('pessimistic_write')
        .where('enrollment.id = :id', { id })
        .andWhere('enrollment.studentId = :studentId', { studentId })
        .getOne();

      if (!enrollment) {
        throw new NotFoundException(ERROR_MESSAGES.ENROLLMENT_NOT_FOUND);
      }

      if (enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new BadRequestException(ERROR_MESSAGES.ENROLLMENT_NOT_ACTIVE);
      }

      // Prevent out-of-order updates from reducing progress.
      const nextProgress = Math.max(enrollment.progress, dto.progress);
      enrollment.progress = nextProgress;

      if (nextProgress === 100) {
        enrollment.status = EnrollmentStatus.COMPLETED;
      }

      return transactionalEnrollmentRepository.save(enrollment);
    });
  }

  async isEnrolled(studentId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
    });
    return !!enrollment;
  }

  private async findPublishedCourseOrFail(courseId: string): Promise<Course> {
    // Verify course exists and is published
    const course = await this.courseRepository.findOne({
      where: { id: courseId, isPublished: true },
    });

    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    return course;
  }

  private assertNotSelfEnrollment(tutorId: string, studentId: string): void {
    // H-2: Prevent self-enrollment
    if (tutorId === studentId) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_ENROLL_OWN_COURSE);
    }
  }

  private async assertNoActiveOrCompletedEnrollment(
    studentId: string,
    courseId: string,
  ): Promise<void> {
    // C-1: Only block if ACTIVE or COMPLETED enrollment exists
    const existing = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
    });

    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_ENROLLED);
    }
  }

  private async tryReactivateDroppedEnrollment(
    studentId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    // C-1: Reactivate DROPPED enrollment instead of creating new
    const dropped = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
        status: EnrollmentStatus.DROPPED,
      },
    });

    if (!dropped) {
      return null;
    }

    dropped.status = EnrollmentStatus.ACTIVE;
    dropped.progress = 0;
    return this.enrollmentRepository.save(dropped);
  }

  private async createEnrollmentSafely(
    studentId: string,
    courseId: string,
  ): Promise<Enrollment> {
    // Create and save with DB-level unique constraint as safety net
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
    });

    try {
      return await this.enrollmentRepository.save(enrollment);
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as Record<string, unknown>)['code'] ===
          UNIQUE_VIOLATION_CODE
      ) {
        throw new ConflictException(ERROR_MESSAGES.ALREADY_ENROLLED);
      }
      throw error;
    }
  }

  private async replayEnrollment(record: IdempotencyKey): Promise<Enrollment> {
    const enrollmentId = this.readEnrollmentId(record.responseBody);
    if (!enrollmentId) {
      throw new NotFoundException(ERROR_MESSAGES.ENROLLMENT_NOT_FOUND);
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException(ERROR_MESSAGES.ENROLLMENT_NOT_FOUND);
    }

    return enrollment;
  }

  private readEnrollmentId(responseBody: unknown): string | null {
    if (!responseBody || typeof responseBody !== 'object') {
      return null;
    }

    const enrollmentId = (responseBody as Record<string, unknown>)[
      'enrollmentId'
    ];
    return typeof enrollmentId === 'string' ? enrollmentId : null;
  }
}
