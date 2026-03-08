import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { CourseCategory, CourseDifficulty } from '../common/enums/index.js';
import { AdminContentController } from './admin-content.controller.js';
import { AdminContentService } from './admin-content.service.js';
import { AdminAssignmentResponseDto } from './dto/admin-assignment-response.dto.js';
import { AdminCourseResponseDto } from './dto/admin-course-response.dto.js';
import { AdminSubmissionResponseDto } from './dto/admin-submission-response.dto.js';
import { UpdateAdminModerationDto } from './dto/update-admin-moderation.dto.js';

const adminReq = {
  user: {
    userId: 'admin-uuid',
    email: 'admin@example.com',
    role: 'admin',
  },
};

const course = {
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
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
};

const assignment = {
  id: 'assignment-uuid',
  title: '과제',
  description: 'desc',
  courseId: 'course-uuid',
  dueDate: null,
  isPublished: true,
  isAdminHidden: false,
  adminHiddenReason: null,
  adminHiddenAt: null,
  createdAt: new Date('2026-03-02T00:00:00.000Z'),
  updatedAt: new Date('2026-03-02T00:00:00.000Z'),
};

const submission = {
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

describe('AdminContentController', () => {
  let controller: AdminContentController;
  let adminContentService: Partial<
    Record<keyof AdminContentService, jest.Mock>
  >;

  beforeEach(async () => {
    adminContentService = {
      findAllCourses: jest.fn(),
      findCourseById: jest.fn(),
      updateCourseModeration: jest.fn(),
      findAllAssignments: jest.fn(),
      findAssignmentById: jest.fn(),
      updateAssignmentModeration: jest.fn(),
      findAllSubmissions: jest.fn(),
      findSubmissionById: jest.fn(),
      updateSubmissionModeration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminContentController],
      providers: [
        { provide: AdminContentService, useValue: adminContentService },
      ],
    }).compile();

    controller = module.get<AdminContentController>(AdminContentController);
  });

  it('관리자 강좌 목록 조회는 DTO 페이지네이션을 반환해야 한다', async () => {
    adminContentService.findAllCourses!.mockResolvedValue(
      new PaginatedResponseDto([course], 1, 1, 10),
    );

    const result = await controller.findAllCourses({ page: 1, limit: 10 });

    expect(result.data[0]).toBeInstanceOf(AdminCourseResponseDto);
  });

  it('강좌 moderation 변경은 actorId와 함께 service를 호출해야 한다', async () => {
    const dto: UpdateAdminModerationDto = {
      isHidden: true,
      reason: 'policy violation',
    };
    adminContentService.updateCourseModeration!.mockResolvedValue({
      ...course,
      isAdminHidden: true,
    });

    const result = await controller.updateCourseModeration(
      adminReq,
      'course-uuid',
      dto,
    );

    expect(result).toBeInstanceOf(AdminCourseResponseDto);
    expect(adminContentService.updateCourseModeration).toHaveBeenCalledWith(
      'admin-uuid',
      'course-uuid',
      dto,
    );
  });

  it('관리자 과제 목록 조회는 DTO 페이지네이션을 반환해야 한다', async () => {
    adminContentService.findAllAssignments!.mockResolvedValue(
      new PaginatedResponseDto([assignment], 1, 1, 10),
    );

    const result = await controller.findAllAssignments({ page: 1, limit: 10 });

    expect(result.data[0]).toBeInstanceOf(AdminAssignmentResponseDto);
  });

  it('관리자 제출 목록 조회는 DTO 페이지네이션을 반환해야 한다', async () => {
    adminContentService.findAllSubmissions!.mockResolvedValue(
      new PaginatedResponseDto([submission], 1, 1, 10),
    );

    const result = await controller.findAllSubmissions({ page: 1, limit: 10 });

    expect(result.data[0]).toBeInstanceOf(AdminSubmissionResponseDto);
  });
});
