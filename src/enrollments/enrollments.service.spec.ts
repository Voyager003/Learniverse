import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  ObjectLiteral,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { EnrollmentStatus } from '../common/enums/index.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let enrollmentRepository: MockRepository<Enrollment>;
  let courseRepository: MockRepository<Course>;
  let dataSource: { transaction: jest.Mock };
  let idempotencyService: { execute: jest.Mock };

  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const transactionalEnrollmentRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    save: jest.fn(),
  };

  beforeEach(async () => {
    enrollmentRepository = createMockRepository<Enrollment>();
    courseRepository = createMockRepository<Course>();
    idempotencyService = {
      execute: jest.fn(async (options: { run: () => Promise<unknown> }) =>
        options.run(),
      ),
    };

    dataSource = {
      transaction: jest.fn((callback: (manager: unknown) => unknown) =>
        Promise.resolve(
          callback({
            getRepository: () => transactionalEnrollmentRepository,
          }),
        ),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: IdempotencyService,
          useValue: idempotencyService,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: enrollmentRepository,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    const dto: CreateEnrollmentDto = { courseId: 'course-uuid' };

    it('수강을 생성하고 반환해야 한다', async () => {
      const course = {
        id: 'course-uuid',
        isPublished: true,
        tutorId: 'tutor-uuid',
      } as Course;
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        courseId: 'course-uuid',
        status: EnrollmentStatus.ACTIVE,
        progress: 0,
      } as Enrollment;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      enrollmentRepository.create!.mockReturnValue(enrollment);
      enrollmentRepository.save!.mockResolvedValue(enrollment);

      const result = await service.enroll('student-uuid', dto, 'idem-key-1');

      expect(result).toEqual(enrollment);
      expect(idempotencyService.execute).toHaveBeenCalled();
      expect(enrollmentRepository.create).toHaveBeenCalledWith({
        studentId: 'student-uuid',
        courseId: 'course-uuid',
      });
    });

    it('강좌를 찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('자신의 강좌에 수강 신청하면 BadRequestException을 던져야 한다', async () => {
      const course = {
        id: 'course-uuid',
        isPublished: true,
        tutorId: 'tutor-uuid',
      } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(service.enroll('tutor-uuid', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ACTIVE 수강이 존재하면 ConflictException을 던져야 한다', async () => {
      const course = {
        id: 'course-uuid',
        isPublished: true,
        tutorId: 'tutor-uuid',
      } as Course;
      const existing = {
        id: 'existing-enrollment',
        status: EnrollmentStatus.ACTIVE,
      } as Enrollment;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository.findOne!.mockResolvedValueOnce(existing);

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('COMPLETED 수강이 존재하면 ConflictException을 던져야 한다', async () => {
      const course = {
        id: 'course-uuid',
        isPublished: true,
        tutorId: 'tutor-uuid',
      } as Course;
      const existing = {
        id: 'existing-enrollment',
        status: EnrollmentStatus.COMPLETED,
      } as Enrollment;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository.findOne!.mockResolvedValueOnce(existing);

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('새로 생성하는 대신 DROPPED 수강을 재활성화해야 한다', async () => {
      const course = {
        id: 'course-uuid',
        isPublished: true,
        tutorId: 'tutor-uuid',
      } as Course;
      const dropped = {
        id: 'dropped-enrollment',
        studentId: 'student-uuid',
        courseId: 'course-uuid',
        status: EnrollmentStatus.DROPPED,
        progress: 50,
      } as Enrollment;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(dropped);
      enrollmentRepository.save!.mockImplementation((e: Enrollment) =>
        Promise.resolve(e),
      );

      const result = await service.enroll('student-uuid', dto);

      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
      expect(result.progress).toBe(0);
      expect(enrollmentRepository.create).not.toHaveBeenCalled();
    });

    it('DB 유니크 제약 조건 위반 시 ConflictException을 던져야 한다', async () => {
      const course = {
        id: 'course-uuid',
        isPublished: true,
        tutorId: 'tutor-uuid',
      } as Course;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      enrollmentRepository.create!.mockReturnValue({} as Enrollment);

      const driverError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      const queryError = new QueryFailedError(
        'INSERT INTO enrollments',
        [],
        driverError,
      );
      enrollmentRepository.save!.mockRejectedValue(queryError);

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findMyEnrollments', () => {
    it('course 관계와 함께 페이지네이션된 수강 목록을 반환해야 한다', async () => {
      const enrollments = [
        { id: 'e1', studentId: 'student-uuid', course: { title: 'Course 1' } },
        { id: 'e2', studentId: 'student-uuid', course: { title: 'Course 2' } },
      ] as Enrollment[];

      enrollmentRepository.findAndCount!.mockResolvedValue([enrollments, 2]);

      const result = await service.findMyEnrollments('student-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(enrollments);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('updateProgress', () => {
    it('진행률을 증가 방향으로만 업데이트해야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        status: EnrollmentStatus.ACTIVE,
        progress: 60,
      } as Enrollment;

      queryBuilder.getOne.mockResolvedValue(enrollment);
      transactionalEnrollmentRepository.save.mockImplementation(
        (e: Enrollment) => Promise.resolve(e),
      );

      const result = await service.updateProgress(
        'enrollment-uuid',
        'student-uuid',
        {
          progress: 40,
        },
      );

      expect(result.progress).toBe(60);
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('진행률이 100에 도달하면 완료 처리해야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        status: EnrollmentStatus.ACTIVE,
        progress: 90,
      } as Enrollment;

      queryBuilder.getOne.mockResolvedValue(enrollment);
      transactionalEnrollmentRepository.save.mockImplementation(
        (e: Enrollment) => Promise.resolve(e),
      );

      const result = await service.updateProgress(
        'enrollment-uuid',
        'student-uuid',
        {
          progress: 100,
        },
      );

      expect(result.progress).toBe(100);
      expect(result.status).toBe(EnrollmentStatus.COMPLETED);
    });

    it('수강이 없으면 NotFoundException을 던져야 한다', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.updateProgress('enrollment-uuid', 'student-uuid', {
          progress: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('활성 상태가 아니면 BadRequestException을 던져야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        status: EnrollmentStatus.DROPPED,
        progress: 20,
      } as Enrollment;

      queryBuilder.getOne.mockResolvedValue(enrollment);

      await expect(
        service.updateProgress('enrollment-uuid', 'student-uuid', {
          progress: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
