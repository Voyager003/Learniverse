import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { CourseCategory, CourseDifficulty } from '../common/enums/index.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { Course } from '../courses/entities/course.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminContentService } from './admin-content.service.js';
import { AdminAssignmentQueryDto } from './dto/admin-assignment-query.dto.js';
import { AdminCourseQueryDto } from './dto/admin-course-query.dto.js';
import { AdminSubmissionQueryDto } from './dto/admin-submission-query.dto.js';
import { UpdateAdminModerationDto } from './dto/update-admin-moderation.dto.js';
import { Submission } from '../submissions/schemas/submission.schema.js';

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const baseCourse: Course = {
  id: 'course-uuid',
  title: 'NestJS',
  description: 'desc',
  category: CourseCategory.PROGRAMMING,
  difficulty: CourseDifficulty.BEGINNER,
  isPublished: true,
  isAdminHidden: false,
  adminHiddenReason: null,
  adminHiddenAt: null,
  tutorId: 'tutor-uuid',
  tutor: undefined as never,
  lectures: [],
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
};

const baseAssignment: Assignment = {
  id: 'assignment-uuid',
  title: '과제',
  description: 'desc',
  courseId: 'course-uuid',
  course: { ...baseCourse },
  dueDate: null,
  isPublished: true,
  isAdminHidden: false,
  adminHiddenReason: null,
  adminHiddenAt: null,
  createdAt: new Date('2026-03-02T00:00:00.000Z'),
  updatedAt: new Date('2026-03-02T00:00:00.000Z'),
};

describe('AdminContentService', () => {
  let service: AdminContentService;
  let courseRepository: MockRepository<Course>;
  let assignmentRepository: MockRepository<Assignment>;
  let userRepository: MockRepository<User>;
  let submissionModel: Record<string, jest.Mock>;
  let adminAuditService: Partial<Record<keyof AdminAuditService, jest.Mock>>;

  beforeEach(async () => {
    courseRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    assignmentRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    userRepository = {
      find: jest.fn(),
    };
    submissionModel = {
      find: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    adminAuditService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminContentService,
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: assignmentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getModelToken(Submission.name),
          useValue: submissionModel,
        },
        {
          provide: AdminAuditService,
          useValue: adminAuditService,
        },
      ],
    }).compile();

    service = module.get<AdminContentService>(AdminContentService);
  });

  describe('findAllCourses', () => {
    it('운영 필터를 반영한 페이지네이션 결과를 반환해야 한다', async () => {
      courseRepository.findAndCount!.mockResolvedValue([[baseCourse], 1]);

      const query: AdminCourseQueryDto = {
        page: 2,
        limit: 20,
        tutorId: 'tutor-uuid',
        isPublished: true,
        isAdminHidden: false,
      };

      const result = await service.findAllCourses(query);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual([baseCourse]);
      expect(courseRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          tutorId: 'tutor-uuid',
          isPublished: true,
          isAdminHidden: false,
        },
        relations: ['tutor'],
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 20,
      });
    });
  });

  describe('updateCourseModeration', () => {
    it('강좌 숨김 상태를 변경하고 감사 로그를 남겨야 한다', async () => {
      const dto: UpdateAdminModerationDto = {
        isHidden: true,
        reason: 'policy violation',
      };
      courseRepository.findOne!.mockResolvedValue({ ...baseCourse });
      courseRepository.save!.mockImplementation((course) =>
        Promise.resolve(course),
      );

      const result = await service.updateCourseModeration(
        'admin-uuid',
        'course-uuid',
        dto,
      );

      expect(result.isAdminHidden).toBe(true);
      expect(result.adminHiddenReason).toBe('policy violation');
      expect(adminAuditService.record).toHaveBeenCalledWith({
        actorId: 'admin-uuid',
        action: 'courses.update_moderation',
        resourceType: 'course',
        resourceId: 'course-uuid',
        beforeState: {
          isAdminHidden: false,
          adminHiddenReason: null,
        },
        afterState: {
          isAdminHidden: true,
          adminHiddenReason: 'policy violation',
        },
        metadata: { reason: 'policy violation' },
      });
    });
  });

  describe('findAllAssignments', () => {
    it('운영 필터를 반영한 과제 목록을 반환해야 한다', async () => {
      assignmentRepository.findAndCount!.mockResolvedValue([
        [baseAssignment],
        1,
      ]);

      const query: AdminAssignmentQueryDto = {
        page: 1,
        limit: 10,
        courseId: 'course-uuid',
        isPublished: true,
        isAdminHidden: false,
      };

      const result = await service.findAllAssignments(query);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(assignmentRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          courseId: 'course-uuid',
          isPublished: true,
          isAdminHidden: false,
        },
        relations: ['course'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findAllSubmissions', () => {
    it('운영 필터를 반영한 제출 목록과 학생 이름을 반환해야 한다', async () => {
      const submissionDoc = {
        _id: { toString: () => 'submission-id' },
        id: 'submission-id',
        studentId: 'student-uuid',
        assignmentId: 'assignment-uuid',
        content: 'content',
        fileUrls: [],
        status: 'submitted',
        feedback: null,
        score: null,
        reviewedAt: null,
        isAdminHidden: false,
        adminHiddenReason: null,
        adminHiddenAt: null,
        createdAt: new Date('2026-03-03T00:00:00.000Z'),
        updatedAt: new Date('2026-03-03T00:00:00.000Z'),
      };
      const query: AdminSubmissionQueryDto = {
        page: 1,
        limit: 10,
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        isAdminHidden: false,
      };
      submissionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([submissionDoc]),
      });
      submissionModel.countDocuments.mockResolvedValue(1);
      userRepository.find!.mockResolvedValue([
        { id: 'student-uuid', name: '홍길동' },
      ]);

      const result = await service.findAllSubmissions(query);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(submissionModel.find).toHaveBeenCalledWith({
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        isAdminHidden: false,
      });
      expect(result.data[0]).toMatchObject({
        studentName: '홍길동',
      });
    });
  });

  describe('updateSubmissionModeration', () => {
    it('제출 숨김 상태를 변경하고 감사 로그를 남겨야 한다', async () => {
      const dto: UpdateAdminModerationDto = {
        isHidden: true,
        reason: 'plagiarism',
      };
      const existingDoc = {
        _id: { toString: () => 'submission-id' },
        studentId: 'student-uuid',
        assignmentId: 'assignment-uuid',
        content: 'content',
        fileUrls: [],
        status: 'submitted',
        feedback: null,
        score: null,
        reviewedAt: null,
        isAdminHidden: false,
        adminHiddenReason: null,
        adminHiddenAt: null,
        createdAt: new Date('2026-03-03T00:00:00.000Z'),
        updatedAt: new Date('2026-03-03T00:00:00.000Z'),
      };
      const updatedDoc = {
        ...existingDoc,
        isAdminHidden: true,
        adminHiddenReason: 'plagiarism',
        adminHiddenAt: new Date('2026-03-05T00:00:00.000Z'),
      };
      submissionModel.findById.mockResolvedValue(existingDoc);
      submissionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.updateSubmissionModeration(
        'admin-uuid',
        'submission-id',
        dto,
      );

      expect(result.isAdminHidden).toBe(true);
      expect(adminAuditService.record).toHaveBeenCalledWith({
        actorId: 'admin-uuid',
        action: 'submissions.update_moderation',
        resourceType: 'submission',
        resourceId: 'submission-id',
        beforeState: {
          isAdminHidden: false,
          adminHiddenReason: null,
        },
        afterState: {
          isAdminHidden: true,
          adminHiddenReason: 'plagiarism',
        },
        metadata: { reason: 'plagiarism' },
      });
    });

    it('제출이 없으면 NotFoundException을 던져야 한다', async () => {
      submissionModel.findById.mockResolvedValue(null);

      await expect(
        service.updateSubmissionModeration('admin-uuid', 'missing-id', {
          isHidden: true,
          reason: 'plagiarism',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
