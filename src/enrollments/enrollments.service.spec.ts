import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
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
      const course = { id: 'course-uuid', isPublished: true } as Course;
      const enrollment = {
        id: 'enrollment-uuid',
        studentId: 'student-uuid',
        courseId: 'course-uuid',
        status: EnrollmentStatus.ACTIVE,
        progress: 0,
      } as Enrollment;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository.findOne!.mockResolvedValue(null);
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

    it('should throw NotFoundException if course is not published', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if already enrolled (app level)', async () => {
      const course = { id: 'course-uuid', isPublished: true } as Course;
      const existing = { id: 'existing-enrollment' } as Enrollment;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository.findOne!.mockResolvedValue(existing);

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException on DB unique constraint violation', async () => {
      const course = { id: 'course-uuid', isPublished: true } as Course;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository.findOne!.mockResolvedValue(null);
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
      const course = { id: 'course-uuid', isPublished: true } as Course;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentRepository.findOne!.mockResolvedValue(null);
      enrollmentRepository.create!.mockReturnValue({} as Enrollment);
      enrollmentRepository.save!.mockRejectedValue(new Error('unexpected'));

      await expect(service.enroll('student-uuid', dto)).rejects.toThrow(
        'unexpected',
      );
    });
  });

  // --- findMyEnrollments ---

  describe('findMyEnrollments', () => {
    it('should return enrollments with course relation', async () => {
      const enrollments = [
        { id: 'e1', studentId: 'student-uuid', course: { title: 'Course 1' } },
        { id: 'e2', studentId: 'student-uuid', course: { title: 'Course 2' } },
      ] as Enrollment[];

      enrollmentRepository.find!.mockResolvedValue(enrollments);

      const result = await service.findMyEnrollments('student-uuid');

      expect(result).toEqual(enrollments);
      expect(enrollmentRepository.find).toHaveBeenCalledWith({
        where: { studentId: 'student-uuid' },
        relations: ['course'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no enrollments', async () => {
      enrollmentRepository.find!.mockResolvedValue([]);

      const result = await service.findMyEnrollments('student-uuid');

      expect(result).toEqual([]);
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
