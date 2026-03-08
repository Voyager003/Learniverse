import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service.js';
import { Submission } from './schemas/submission.schema.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { SubmissionStatus, Role } from '../common/enums/index.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';
import { CourseEnrollmentPolicy } from '../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../common/policies/course-ownership.policy.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';
import { User } from '../users/entities/user.entity.js';

const mockAssignment = {
  id: 'assignment-uuid',
  courseId: 'course-uuid',
  isPublished: true,
  dueDate: null,
  course: { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course,
} as Assignment;

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let submissionModel: Record<string, jest.Mock>;
  let userRepository: Record<string, jest.Mock>;
  let assignmentsService: Partial<Record<keyof AssignmentsService, jest.Mock>>;
  let courseEnrollmentPolicy: Partial<
    Record<keyof CourseEnrollmentPolicy, jest.Mock>
  >;
  let courseOwnershipPolicy: Partial<
    Record<keyof CourseOwnershipPolicy, jest.Mock>
  >;
  let idempotencyService: { execute: jest.Mock };

  beforeEach(async () => {
    submissionModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    userRepository = {
      find: jest.fn(),
    };

    assignmentsService = {
      findOne: jest.fn(),
    };

    courseEnrollmentPolicy = {
      assertStudentEnrolled: jest.fn(),
    };
    courseOwnershipPolicy = {
      assertTutorOwnsCourse: jest.fn(),
    };
    idempotencyService = {
      execute: jest.fn(async (options: { run: () => Promise<unknown> }) =>
        options.run(),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: submissionModel,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: AssignmentsService,
          useValue: assignmentsService,
        },
        {
          provide: CourseEnrollmentPolicy,
          useValue: courseEnrollmentPolicy,
        },
        {
          provide: CourseOwnershipPolicy,
          useValue: courseOwnershipPolicy,
        },
        {
          provide: IdempotencyService,
          useValue: idempotencyService,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  describe('submit', () => {
    const dto: CreateSubmissionDto = {
      content: '과제 답안입니다.',
    };

    it('수강 중인 학생이 과제를 제출해야 한다', async () => {
      const savedDoc = {
        _id: { toString: () => 'submission-id' },
        id: 'submission-id',
        studentId: 'student-uuid',
        assignmentId: 'assignment-uuid',
        content: dto.content,
        fileUrls: [],
        status: SubmissionStatus.SUBMITTED,
        feedback: null,
        score: null,
        reviewedAt: null,
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      courseEnrollmentPolicy.assertStudentEnrolled!.mockResolvedValue(
        undefined,
      );
      submissionModel.findOne.mockResolvedValue(null);
      submissionModel.create.mockResolvedValue(savedDoc);

      const result = await service.submit(
        'assignment-uuid',
        'student-uuid',
        dto,
        'idem-submit-1',
      );

      expect(result).toEqual(savedDoc);
      expect(idempotencyService.execute).toHaveBeenCalled();
      expect(courseEnrollmentPolicy.assertStudentEnrolled).toHaveBeenCalledWith(
        'student-uuid',
        'course-uuid',
      );
    });

    it('이미 제출한 과제이면 ConflictException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      courseEnrollmentPolicy.assertStudentEnrolled!.mockResolvedValue(
        undefined,
      );
      submissionModel.findOne.mockResolvedValue({ _id: 'existing' });

      await expect(
        service.submit('assignment-uuid', 'student-uuid', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('공개되지 않은 과제에 제출하면 BadRequestException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue({
        ...mockAssignment,
        isPublished: false,
      });

      await expect(
        service.submit('assignment-uuid', 'student-uuid', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByAssignment', () => {
    it('튜터 조회 시 studentName을 포함한 제출 목록을 반환해야 한다', async () => {
      const submissionDoc = {
        _id: { toString: () => 'submission-id' },
        id: 'submission-id',
        studentId: 'student-uuid',
        assignmentId: 'assignment-uuid',
        content: '과제 답안입니다.',
        fileUrls: [],
        status: SubmissionStatus.SUBMITTED,
        feedback: null,
        score: null,
        reviewedAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      courseOwnershipPolicy.assertTutorOwnsCourse!.mockImplementation(() => {
        // no-op
      });
      submissionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([submissionDoc]),
      });
      userRepository.find.mockResolvedValue([
        { id: 'student-uuid', name: '홍길동' },
      ]);

      const result = await service.findByAssignment(
        'assignment-uuid',
        'tutor-uuid',
        Role.TUTOR,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        studentId: 'student-uuid',
        studentName: '홍길동',
      });
      expect(submissionModel.find).toHaveBeenCalledWith({
        assignmentId: 'assignment-uuid',
        isAdminHidden: { $ne: true },
      });
      expect(userRepository.find).toHaveBeenCalledTimes(1);
    });

    it('학생 조회 시 관리자 숨김 제출물을 제외하고 본인 제출만 조회해야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      courseEnrollmentPolicy.assertStudentEnrolled!.mockResolvedValue(
        undefined,
      );
      submissionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      userRepository.find.mockResolvedValue([]);

      await service.findByAssignment(
        'assignment-uuid',
        'student-uuid',
        Role.STUDENT,
      );

      expect(submissionModel.find).toHaveBeenCalledWith({
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        isAdminHidden: { $ne: true },
      });
    });
  });

  describe('addFeedback', () => {
    const feedbackDto: AddFeedbackDto = {
      feedback: '잘 작성하셨습니다.',
      score: 95,
    };

    it('Tutor가 피드백을 추가하고 REVIEWED로 상태를 변경해야 한다', async () => {
      const submission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        status: SubmissionStatus.SUBMITTED,
      };
      const updatedSubmission = {
        ...submission,
        feedback: feedbackDto.feedback,
        score: feedbackDto.score,
        status: SubmissionStatus.REVIEWED,
      };

      submissionModel.findById.mockResolvedValue(submission);
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedSubmission),
      });

      const result = await service.addFeedback(
        'submission-id',
        'assignment-uuid',
        'tutor-uuid',
        feedbackDto,
      );

      expect(result.status).toBe(SubmissionStatus.REVIEWED);
      expect(submissionModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('score 없이 피드백을 추가하면 RETURNED 상태가 되어야 한다', async () => {
      const submission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        status: SubmissionStatus.SUBMITTED,
      };
      const updatedSubmission = {
        ...submission,
        feedback: '수정 필요',
        score: null,
        status: SubmissionStatus.RETURNED,
      };

      submissionModel.findById.mockResolvedValue(submission);
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedSubmission),
      });

      const result = await service.addFeedback(
        'submission-id',
        'assignment-uuid',
        'tutor-uuid',
        { feedback: '수정 필요' },
      );

      expect(result.status).toBe(SubmissionStatus.RETURNED);
    });

    it('이미 REVIEWED 상태면 ConflictException을 던져야 한다', async () => {
      const submission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        status: SubmissionStatus.SUBMITTED,
      };

      submissionModel.findById.mockResolvedValue(submission);
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.addFeedback(
          'submission-id',
          'assignment-uuid',
          'tutor-uuid',
          feedbackDto,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('URL assignmentId가 다르면 BadRequestException을 던져야 한다', async () => {
      submissionModel.findById.mockResolvedValue({
        _id: 'submission-id',
        assignmentId: 'different-assignment',
      });

      await expect(
        service.addFeedback(
          'submission-id',
          'assignment-uuid',
          'tutor-uuid',
          feedbackDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('제출이 없으면 NotFoundException을 던져야 한다', async () => {
      submissionModel.findById.mockResolvedValue(null);

      await expect(
        service.addFeedback(
          'missing',
          'assignment-uuid',
          'tutor-uuid',
          feedbackDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('소유자가 아닌 Tutor이면 ForbiddenException을 던져야 한다', async () => {
      submissionModel.findById.mockResolvedValue({
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        status: SubmissionStatus.SUBMITTED,
      });
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      courseOwnershipPolicy.assertTutorOwnsCourse!.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(
        service.addFeedback(
          'submission-id',
          'assignment-uuid',
          'other-tutor',
          feedbackDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
