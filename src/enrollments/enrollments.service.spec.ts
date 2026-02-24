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

    it('should create and return an enrollment', async () => {
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

    it('should throw NotFoundException if course not found', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if enrolling in own course', async () => {
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

    it('should throw ConflictException if ACTIVE enrollment exists', async () => {
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

    it('should throw ConflictException if COMPLETED enrollment exists', async () => {
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

    it('should reactivate DROPPED enrollment instead of creating new', async () => {
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

    it('should throw ConflictException on DB unique constraint violation', async () => {
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

    it('should rethrow unexpected errors from save', async () => {
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
    it('should return paginated enrollments with course relation', async () => {
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

    it('should return empty result if no enrollments', async () => {
      enrollmentRepository.findAndCount!.mockResolvedValue([[], 0]);

      const result = await service.findMyEnrollments('student-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should calculate correct skip for page 2', async () => {
      enrollmentRepository.findAndCount!.mockResolvedValue([[], 0]);

      await service.findMyEnrollments('student-uuid', { page: 2, limit: 10 });

      expect(enrollmentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // --- updateProgress ---

  describe('updateProgress', () => {
    it('should update progress and return enrollment', async () => {
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

    it('should auto-complete when progress reaches 100', async () => {
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

    it('should throw BadRequestException if enrollment is COMPLETED', async () => {
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

    it('should throw BadRequestException if enrollment is DROPPED', async () => {
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

    it('should throw NotFoundException if enrollment not found', async () => {
      enrollmentRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateProgress('nonexistent', 'student-uuid', { progress: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if enrollment belongs to another student', async () => {
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
    it('should return true if actively enrolled', async () => {
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

    it('should return true if enrollment is completed', async () => {
      const enrollment = {
        id: 'enrollment-uuid',
        status: EnrollmentStatus.COMPLETED,
      } as Enrollment;
      enrollmentRepository.findOne!.mockResolvedValue(enrollment);

      const result = await service.isEnrolled('student-uuid', 'course-uuid');

      expect(result).toBe(true);
    });

    it('should return false if not enrolled', async () => {
      enrollmentRepository.findOne!.mockResolvedValue(null);

      const result = await service.isEnrolled('student-uuid', 'course-uuid');

      expect(result).toBe(false);
    });
  });
});
