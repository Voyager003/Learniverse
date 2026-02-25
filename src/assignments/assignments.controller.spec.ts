import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';
import { Assignment } from './entities/assignment.entity.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { Course } from '../courses/entities/course.entity.js';
import { Role } from '../common/enums/index.js';

const mockCourse = {
  id: 'course-uuid',
  title: 'NestJS Fundamentals',
} as Course;

const mockAssignment: Assignment = {
  id: 'assignment-uuid',
  title: 'Guard 구현',
  description: 'JwtAuthGuard를 직접 구현해보세요.',
  courseId: 'course-uuid',
  course: mockCourse,
  dueDate: new Date('2026-03-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let assignmentsService: Partial<Record<keyof AssignmentsService, jest.Mock>>;

  const mockReqTutor = {
    user: {
      userId: 'tutor-uuid',
      email: 'tutor@example.com',
      role: Role.TUTOR,
    },
  };

  const mockReqStudent = {
    user: {
      userId: 'student-uuid',
      email: 'student@example.com',
      role: Role.STUDENT,
    },
  };

  beforeEach(async () => {
    assignmentsService = {
      create: jest.fn(),
      findByCourse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        { provide: AssignmentsService, useValue: assignmentsService },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
  });

  describe('POST /courses/:cid/assignments', () => {
    it('과제를 생성하고 AssignmentResponseDto를 반환해야 한다', async () => {
      assignmentsService.create!.mockResolvedValue(mockAssignment);

      const dto = {
        title: 'Guard 구현',
        description: 'JwtAuthGuard를 직접 구현해보세요.',
      };

      const result = await controller.create(mockReqTutor, 'course-uuid', dto);

      expect(result).toBeInstanceOf(AssignmentResponseDto);
      expect(result.id).toBe('assignment-uuid');
      expect(result.courseTitle).toBe('NestJS Fundamentals');
      expect(assignmentsService.create).toHaveBeenCalledWith(
        'course-uuid',
        'tutor-uuid',
        Role.TUTOR,
        dto,
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      assignmentsService.create!.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.create(mockReqTutor, 'course-uuid', {
          title: 'x',
          description: 'x',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NotFoundException을 전파해야 한다', async () => {
      assignmentsService.create!.mockRejectedValue(new NotFoundException());

      await expect(
        controller.create(mockReqTutor, 'nonexistent', {
          title: 'x',
          description: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /courses/:cid/assignments', () => {
    it('AssignmentResponseDto 배열을 반환해야 한다', async () => {
      assignmentsService.findByCourse!.mockResolvedValue([mockAssignment]);

      const result = await controller.findByCourse(
        mockReqStudent,
        'course-uuid',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AssignmentResponseDto);
      expect(assignmentsService.findByCourse).toHaveBeenCalledWith(
        'course-uuid',
        'student-uuid',
        Role.STUDENT,
      );
    });

    it('과제가 없으면 빈 배열을 반환해야 한다', async () => {
      assignmentsService.findByCourse!.mockResolvedValue([]);

      const result = await controller.findByCourse(mockReqTutor, 'course-uuid');

      expect(result).toHaveLength(0);
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      assignmentsService.findByCourse!.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        controller.findByCourse(mockReqStudent, 'course-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
