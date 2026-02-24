import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { EnrollmentStatus } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async enroll(
    studentId: string,
    dto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    // Verify course exists and is published
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId, isPublished: true },
    });
    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    // H-2: Prevent self-enrollment
    if (course.tutorId === studentId) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_ENROLL_OWN_COURSE);
    }

    // C-1: Only block if ACTIVE or COMPLETED enrollment exists
    const existing = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId: dto.courseId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
    });
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_ENROLLED);
    }

    // C-1: Reactivate DROPPED enrollment instead of creating new
    const dropped = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId: dto.courseId,
        status: EnrollmentStatus.DROPPED,
      },
    });
    if (dropped) {
      dropped.status = EnrollmentStatus.ACTIVE;
      dropped.progress = 0;
      return this.enrollmentRepository.save(dropped);
    }

    // Create and save with DB-level unique constraint as safety net
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId: dto.courseId,
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
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id, studentId },
    });

    if (!enrollment) {
      throw new NotFoundException(ERROR_MESSAGES.ENROLLMENT_NOT_FOUND);
    }

    // C-2: Only ACTIVE enrollments can have progress updated
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException(ERROR_MESSAGES.ENROLLMENT_NOT_ACTIVE);
    }

    enrollment.progress = dto.progress;

    // Auto-complete when progress reaches 100
    if (dto.progress === 100) {
      enrollment.status = EnrollmentStatus.COMPLETED;
    }

    return this.enrollmentRepository.save(enrollment);
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
}
