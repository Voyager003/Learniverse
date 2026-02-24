import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsService } from './enrollments.service.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto.js';
import { EnrollmentStatus, Role } from '../common/enums/index.js';
import { Course } from '../courses/entities/course.entity.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';

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

    it('should propagate BadRequestException for self-enrollment', async () => {
      enrollmentsService.enroll!.mockRejectedValue(new BadRequestException());

      await expect(
        controller.enroll(mockReqStudent, { courseId: 'own-course' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /enrollments/my', () => {
    it('should return paginated EnrollmentResponseDto list', async () => {
      const paginated = new PaginatedResponseDto([mockEnrollment], 1, 1, 10);
      enrollmentsService.findMyEnrollments!.mockResolvedValue(paginated);

      const query = { page: 1, limit: 10 };
      const result = await controller.findMyEnrollments(mockReqStudent, query);

      expect(result.data[0]).toBeInstanceOf(EnrollmentResponseDto);
      expect(result.total).toBe(1);
      expect(enrollmentsService.findMyEnrollments).toHaveBeenCalledWith(
        'student-uuid',
        query,
      );
    });

    it('should return empty result if no enrollments', async () => {
      const paginated = new PaginatedResponseDto([], 0, 1, 10);
      enrollmentsService.findMyEnrollments!.mockResolvedValue(paginated);

      const result = await controller.findMyEnrollments(mockReqStudent, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
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

    it('should propagate BadRequestException for non-active enrollment', async () => {
      enrollmentsService.updateProgress!.mockRejectedValue(
        new BadRequestException(),
      );

      await expect(
        controller.updateProgress(mockReqStudent, 'enrollment-uuid', {
          progress: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
