import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { IdempotencyKey } from '../common/idempotency/entities/idempotency-key.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { AdminEnrollmentQueryDto } from './dto/admin-enrollment-query.dto.js';
import { AdminIdempotencyKeyQueryDto } from './dto/admin-idempotency-key-query.dto.js';

@Injectable()
export class AdminOperationsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepository: Repository<IdempotencyKey>,
  ) {}

  async findAllEnrollments(
    query: AdminEnrollmentQueryDto,
  ): Promise<PaginatedResponseDto<Enrollment>> {
    const { page, limit, studentId, courseId, status } = query;
    const where: FindOptionsWhere<Enrollment> = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await this.enrollmentRepository.findAndCount({
      where,
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findEnrollmentById(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException(ERROR_MESSAGES.ENROLLMENT_NOT_FOUND);
    }

    return enrollment;
  }

  async findAllIdempotencyKeys(
    query: AdminIdempotencyKeyQueryDto,
  ): Promise<PaginatedResponseDto<IdempotencyKey>> {
    const { page, limit, userId, path, status, from, to } = query;
    const where: FindOptionsWhere<IdempotencyKey> = {};

    if (userId) {
      where.userId = userId;
    }

    if (path) {
      where.path = path;
    }

    if (status) {
      where.status = status;
    }

    if (from && to) {
      where.createdAt = Between(new Date(from), new Date(to));
    } else if (from) {
      where.createdAt = MoreThanOrEqual(new Date(from));
    } else if (to) {
      where.createdAt = LessThanOrEqual(new Date(to));
    }

    const [data, total] = await this.idempotencyRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
