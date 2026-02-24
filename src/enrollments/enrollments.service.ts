import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
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

    // App-level duplicate check
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, courseId: dto.courseId },
    });
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_ENROLLED);
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

  async findMyEnrollments(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { studentId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
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
