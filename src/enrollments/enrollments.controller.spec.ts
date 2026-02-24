import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsService } from './enrollments.service.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto.js';
import { EnrollmentStatus, Role } from '../common/enums/index.js';
import { Course } from '../courses/entities/course.entity.js';

const mockDate = new Date('2025-01-01');

const mockEnrollment: Enrollment = {
  id: 'enrollment-uuid',
  studentId: 'student-uuid',
  courseId: 'course-uuid',
  status: EnrollmentStatus.ACTIVE,
  progress: 0,
  student: {
    id: 'student-uuid',
    name: 'Student',
  } as Enrollment['student'],
  course: {
    id: 'course-uuid',
    title: 'NestJS Fundamentals',
  } as Course,
  createdAt: mockDate,
  updatedAt: mockDate,
};

describe('EnrollmentsController', () => {
  let controller: EnrollmentsController;
  let enrollmentsService: Partial<Record<keyof EnrollmentsService, jest.Mock>>;

  const mockReqStudent = {
    user: {
      userId: 'student-uuid',
      email: 'student@example.com',
      role: Role.STUDENT,
    },
  };

  beforeEach(async () => {
    enrollmentsService = {
      enroll: jest.fn(),
      findMyEnrollments: jest.fn(),
      updateProgress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentsController],
      providers: [
        { provide: EnrollmentsService, useValue: enrollmentsService },
      ],
    }).compile();

    controller = module.get<EnrollmentsController>(EnrollmentsController);
  });

  describe('POST /enrollments', () => {
    it('should enroll and return EnrollmentResponseDto', async () => {
      enrollmentsService.enroll!.mockResolvedValue(mockEnrollment);

      const dto = { courseId: 'course-uuid' };
      const result = await controller.enroll(mockReqStudent, dto);

      expect(result).toBeInstanceOf(EnrollmentResponseDto);
      expect(result.id).toBe('enrollment-uuid');
      expect(result.courseTitle).toBe('NestJS Fundamentals');
      expect(enrollmentsService.enroll).toHaveBeenCalledWith(
        'student-uuid',
        dto,
      );
    });

    it('should propagate ConflictException', async () => {
      enrollmentsService.enroll!.mockRejectedValue(new ConflictException());

      await expect(
        controller.enroll(mockReqStudent, { courseId: 'course-uuid' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate NotFoundException', async () => {
      enrollmentsService.enroll!.mockRejectedValue(new NotFoundException());

      await expect(
        controller.enroll(mockReqStudent, { courseId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /enrollments/my', () => {
    it('should return array of EnrollmentResponseDto', async () => {
      enrollmentsService.findMyEnrollments!.mockResolvedValue([mockEnrollment]);

      const result = await controller.findMyEnrollments(mockReqStudent);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(EnrollmentResponseDto);
      expect(result[0].id).toBe('enrollment-uuid');
      expect(enrollmentsService.findMyEnrollments).toHaveBeenCalledWith(
        'student-uuid',
      );
    });

    it('should return empty array if no enrollments', async () => {
      enrollmentsService.findMyEnrollments!.mockResolvedValue([]);

      const result = await controller.findMyEnrollments(mockReqStudent);

      expect(result).toHaveLength(0);
    });
  });

  describe('PATCH /enrollments/:id/progress', () => {
    it('should update progress and return EnrollmentResponseDto', async () => {
      const updated = { ...mockEnrollment, progress: 50 };
      enrollmentsService.updateProgress!.mockResolvedValue(updated);

      const dto = { progress: 50 };
      const result = await controller.updateProgress(
        mockReqStudent,
        'enrollment-uuid',
        dto,
      );

      expect(result).toBeInstanceOf(EnrollmentResponseDto);
      expect(result.progress).toBe(50);
      expect(enrollmentsService.updateProgress).toHaveBeenCalledWith(
        'enrollment-uuid',
        'student-uuid',
        dto,
      );
    });

    it('should propagate NotFoundException', async () => {
      enrollmentsService.updateProgress!.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.updateProgress(mockReqStudent, 'nonexistent', {
          progress: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
