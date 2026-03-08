import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { EnrollmentStatus } from '../common/enums/index.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import {
  IDEMPOTENCY_STATUS,
  IdempotencyKey,
} from '../common/idempotency/entities/idempotency-key.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { AdminOperationsService } from './admin-operations.service.js';
import { AdminEnrollmentQueryDto } from './dto/admin-enrollment-query.dto.js';
import { AdminIdempotencyKeyQueryDto } from './dto/admin-idempotency-key-query.dto.js';

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const enrollment = {
  id: 'enrollment-uuid',
  studentId: 'student-uuid',
  courseId: 'course-uuid',
  status: EnrollmentStatus.ACTIVE,
  progress: 35,
  student: { id: 'student-uuid', name: '홍길동' },
  course: { id: 'course-uuid', title: 'NestJS' },
  createdAt: new Date('2026-03-07T00:00:00.000Z'),
  updatedAt: new Date('2026-03-07T00:00:00.000Z'),
} as Enrollment;

const idempotencyKey = {
  id: 'idem-uuid',
  userId: 'student-uuid',
  method: 'POST',
  path: '/api/v1/enrollments',
  key: 'idem-key',
  requestHash: 'hash',
  status: IDEMPOTENCY_STATUS.COMPLETED,
  responseStatus: 201,
  responseBody: { enrollmentId: 'enrollment-uuid' },
  expiresAt: new Date('2026-03-08T00:00:00.000Z'),
  createdAt: new Date('2026-03-07T00:00:00.000Z'),
  updatedAt: new Date('2026-03-07T00:00:00.000Z'),
} as IdempotencyKey;

describe('AdminOperationsService', () => {
  let service: AdminOperationsService;
  let enrollmentRepository: MockRepository<Enrollment>;
  let idempotencyRepository: MockRepository<IdempotencyKey>;

  beforeEach(async () => {
    enrollmentRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };
    idempotencyRepository = {
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOperationsService,
        {
          provide: getRepositoryToken(Enrollment),
          useValue: enrollmentRepository,
        },
        {
          provide: getRepositoryToken(IdempotencyKey),
          useValue: idempotencyRepository,
        },
      ],
    }).compile();

    service = module.get<AdminOperationsService>(AdminOperationsService);
  });

  describe('findAllEnrollments', () => {
    it('운영 필터를 반영한 수강 목록을 반환해야 한다', async () => {
      enrollmentRepository.findAndCount!.mockResolvedValue([[enrollment], 1]);
      const query: AdminEnrollmentQueryDto = {
        studentId: 'student-uuid',
        courseId: 'course-uuid',
        status: EnrollmentStatus.ACTIVE,
        page: 2,
        limit: 20,
      };

      const result = await service.findAllEnrollments(query);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(enrollmentRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          studentId: 'student-uuid',
          courseId: 'course-uuid',
          status: EnrollmentStatus.ACTIVE,
        },
        relations: ['student', 'course'],
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 20,
      });
    });
  });

  describe('findEnrollmentById', () => {
    it('수강 상세를 반환해야 한다', async () => {
      enrollmentRepository.findOne!.mockResolvedValue(enrollment);

      const result = await service.findEnrollmentById('enrollment-uuid');

      expect(result).toBe(enrollment);
      expect(enrollmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'enrollment-uuid' },
        relations: ['student', 'course'],
      });
    });

    it('수강 정보가 없으면 NotFoundException을 던져야 한다', async () => {
      enrollmentRepository.findOne!.mockResolvedValue(null);

      await expect(service.findEnrollmentById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllIdempotencyKeys', () => {
    it('기본 필터로 멱등성 키 목록을 반환해야 한다', async () => {
      idempotencyRepository.findAndCount!.mockResolvedValue([
        [idempotencyKey],
        1,
      ]);
      const query: AdminIdempotencyKeyQueryDto = {
        userId: 'student-uuid',
        path: '/api/v1/enrollments',
        status: IDEMPOTENCY_STATUS.COMPLETED,
        page: 1,
        limit: 10,
      };

      const result = await service.findAllIdempotencyKeys(query);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(idempotencyRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          userId: 'student-uuid',
          path: '/api/v1/enrollments',
          status: IDEMPOTENCY_STATUS.COMPLETED,
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('기간 필터가 from/to 모두 있으면 Between을 사용해야 한다', async () => {
      idempotencyRepository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAllIdempotencyKeys({
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-08T00:00:00.000Z',
        page: 1,
        limit: 10,
      });

      expect(idempotencyRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          createdAt: Between(
            new Date('2026-03-01T00:00:00.000Z'),
            new Date('2026-03-08T00:00:00.000Z'),
          ),
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('from만 있으면 MoreThanOrEqual을 사용해야 한다', async () => {
      idempotencyRepository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAllIdempotencyKeys({
        from: '2026-03-01T00:00:00.000Z',
        page: 1,
        limit: 10,
      });

      expect(idempotencyRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          createdAt: MoreThanOrEqual(new Date('2026-03-01T00:00:00.000Z')),
        } satisfies FindOptionsWhere<IdempotencyKey>,
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('to만 있으면 LessThanOrEqual을 사용해야 한다', async () => {
      idempotencyRepository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAllIdempotencyKeys({
        to: '2026-03-08T00:00:00.000Z',
        page: 1,
        limit: 10,
      });

      expect(idempotencyRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          createdAt: LessThanOrEqual(new Date('2026-03-08T00:00:00.000Z')),
        } satisfies FindOptionsWhere<IdempotencyKey>,
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });
});
