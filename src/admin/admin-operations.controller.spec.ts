import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentStatus } from '../common/enums/index.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import {
  IDEMPOTENCY_STATUS,
  IdempotencyKey,
} from '../common/idempotency/entities/idempotency-key.entity.js';
import { EnrollmentResponseDto } from '../enrollments/dto/enrollment-response.dto.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { AdminOperationsController } from './admin-operations.controller.js';
import { AdminOperationsService } from './admin-operations.service.js';
import { AdminIdempotencyKeyResponseDto } from './dto/admin-idempotency-key-response.dto.js';

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

describe('AdminOperationsController', () => {
  let controller: AdminOperationsController;
  let adminOperationsService: Partial<
    Record<keyof AdminOperationsService, jest.Mock>
  >;

  beforeEach(async () => {
    adminOperationsService = {
      findAllEnrollments: jest.fn(),
      findEnrollmentById: jest.fn(),
      findAllIdempotencyKeys: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOperationsController],
      providers: [
        {
          provide: AdminOperationsService,
          useValue: adminOperationsService,
        },
      ],
    }).compile();

    controller = module.get<AdminOperationsController>(
      AdminOperationsController,
    );
  });

  it('수강 목록은 EnrollmentResponseDto 페이지네이션을 반환해야 한다', async () => {
    adminOperationsService.findAllEnrollments!.mockResolvedValue(
      new PaginatedResponseDto([enrollment], 1, 1, 10),
    );

    const result = await controller.findAllEnrollments({ page: 1, limit: 10 });

    expect(result.data[0]).toBeInstanceOf(EnrollmentResponseDto);
  });

  it('수강 상세는 EnrollmentResponseDto를 반환해야 한다', async () => {
    adminOperationsService.findEnrollmentById!.mockResolvedValue(enrollment);

    const result = await controller.findEnrollmentById('enrollment-uuid');

    expect(result).toBeInstanceOf(EnrollmentResponseDto);
  });

  it('멱등성 키 목록은 AdminIdempotencyKeyResponseDto 페이지네이션을 반환해야 한다', async () => {
    adminOperationsService.findAllIdempotencyKeys!.mockResolvedValue(
      new PaginatedResponseDto([idempotencyKey], 1, 1, 10),
    );

    const result = await controller.findAllIdempotencyKeys({
      page: 1,
      limit: 10,
    });

    expect(result.data[0]).toBeInstanceOf(AdminIdempotencyKeyResponseDto);
  });
});
