import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
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
import { UpdateProgressDto } from './dto/update-progress.dto.js';

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

  beforeEach(async () => {
    enrollmentRepository = createMockRepository<Enrollment>();
    courseRepository = createMockRepository<Course>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
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
  });

  // --- enroll ---

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
      // First findOne: active/completed check → null
      // Second findOne: dropped check → null
      enrollmentRepository
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      enrollmentRepository.create!.mockReturnValue(enrollment);
      enrollmentRepository.save!.mockResolvedValue(enrollment);

      const result = await service.enroll('student-uuid', dto);

      expect(result).toEqual(enrollment);
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
      // First findOne: active/completed check → null
      // Second findOne: dropped check → found
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

    it('save에서 발생한 예상치 못한 에러를 다시 던져야 한다', async () => {
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
      enrollmentRepository.save!.mockRejectedValue(new Error('unexpected'));

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        'unexpected',
      );
    });
  });

  // --- findMyEnrollments ---

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
      expect(enrollmentRepository.findAndCount).toHaveBeenCalledWith({
        where: { studentId: 'student-uuid' },
        relations: ['course'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('수강이 없으면 빈 결과를 반환해야 한다', async () => {
      enrollmentRepository.findAndCount!.mockResolvedValue([[], 0]);

      const result = await service.findMyEnrollments('student-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('페이지 2에 대해 올바른 skip을 계산해야 한다', async () => {
      enrollmentRepository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findMyEnrollments('student-uuid', { page: 2, limit: 10 });

      expect(enrollmentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // --- updateProgress ---

  describe('updateProgress', () => {
    it('진행률을 업데이트하고 수강을 반환해야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        status: EnrollmentStatus.ACTIVE,
        progress: 30,
      } as Enrollment;
      const updated = { ...enrollment, progress: 60 } as Enrollment;
      const dto: UpdateProgressDto = { progress: 60 };

      enrollmentRepository.findOne!.mockResolvedValue(enrollment);
      enrollmentRepository.save!.mockResolvedValue(updated);

      const result = await service.updateProgress(
        'enrollment-uuid',
        'student-uuid',
        dto,
      );

      expect(result.progress).toBe(60);
      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it('진행률이 100에 도달하면 자동으로 완료 처리해야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        status: EnrollmentStatus.ACTIVE,
        progress: 90,
      } as Enrollment;
      const dto: UpdateProgressDto = { progress: 100 };

      enrollmentRepository.findOne!.mockResolvedValue(enrollment);
      enrollmentRepository.save!.mockImplementation((e: Enrollment) =>
        Promise.resolve(e),
      );

      const result = await service.updateProgress(
        'enrollment-uuid',
        'student-uuid',
        dto,
      );

      expect(result.progress).toBe(100);
      expect(result.status).toBe(EnrollmentStatus.COMPLETED);
    });

    it('수강이 COMPLETED 상태이면 BadRequestException을 던져야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        status: EnrollmentStatus.COMPLETED,
        progress: 100,
      } as Enrollment;

      enrollmentRepository.findOne!.mockResolvedValue(enrollment);

      await expect(
        service.updateProgress('enrollment-uuid', 'student-uuid', {
          progress: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('수강이 DROPPED 상태이면 BadRequestException을 던져야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        status: EnrollmentStatus.DROPPED,
        progress: 30,
      } as Enrollment;

      enrollmentRepository.findOne!.mockResolvedValue(enrollment);

      await expect(
        service.updateProgress('enrollment-uuid', 'student-uuid', {
          progress: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('수강을 찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      enrollmentRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateProgress('nonexistent', 'student-uuid', { progress: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('다른 학생의 수강이면 NotFoundException을 던져야 한다', async () => {
      enrollmentRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateProgress('enrollment-uuid', 'other-student', {
          progress: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- isEnrolled ---

  describe('isEnrolled', () => {
    it('활성 수강 중이면 true를 반환해야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        status: EnrollmentStatus.ACTIVE,
      } as Enrollment;
      enrollmentRepository.findOne!.mockResolvedValue(enrollment);

      const result = await service.isEnrolled('student-uuid', 'course-uuid');

      expect(result).toBe(true);
      expect(enrollmentRepository.findOne).toHaveBeenCalledWith({
        where: {
          studentId: 'student-uuid',
          courseId: 'course-uuid',
          status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
        },
      });
    });

    it('수강이 완료 상태이면 true를 반환해야 한다', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        status: EnrollmentStatus.COMPLETED,
      } as Enrollment;
      enrollmentRepository.findOne!.mockResolvedValue(enrollment);

      const result = await service.isEnrolled('student-uuid', 'course-uuid');

      expect(result).toBe(true);
    });

    it('수강하지 않았으면 false를 반환해야 한다', async () => {
      enrollmentRepository.findOne!.mockResolvedValue(null);

      const result = await service.isEnrolled('student-uuid', 'course-uuid');

      expect(result).toBe(false);
    });
  });
});
