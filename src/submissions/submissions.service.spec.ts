import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service.js';
import { Submission } from './schemas/submission.schema.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { SubmissionStatus, Role } from '../common/enums/index.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';

interface MockSubmission {
  _id: string;
  assignmentId: string;
  studentId: string;
  status: SubmissionStatus;
  feedback?: string | null;
  score?: number | null;
  reviewedAt?: Date | null;
  save: jest.Mock;
}

const mockAssignment = {
  id: 'assignment-uuid',
  courseId: 'course-uuid',
  course: { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course,
} as Assignment;

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let submissionModel: Record<string, jest.Mock>;
  let assignmentsService: Partial<Record<keyof AssignmentsService, jest.Mock>>;
  let enrollmentsService: Partial<Record<keyof EnrollmentsService, jest.Mock>>;

  beforeEach(async () => {
    submissionModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    assignmentsService = {
      findOne: jest.fn(),
    };

    enrollmentsService = {
      isEnrolled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getModelToken(Submission.name),
          useValue: submissionModel,
        },
        {
          provide: AssignmentsService,
          useValue: assignmentsService,
        },
        {
          provide: EnrollmentsService,
          useValue: enrollmentsService,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  // --- submit ---

  describe('submit', () => {
    const dto: CreateSubmissionDto = {
      content: '과제 답안입니다.',
    };

    it('수강 중인 학생이 과제를 제출해야 한다', async () => {
      const savedDoc = {
        _id: { toString: () => 'submission-id' },
        studentId: 'student-uuid',
        assignmentId: 'assignment-uuid',
        content: dto.content,
        fileUrls: [],
        status: SubmissionStatus.SUBMITTED,
        feedback: null,
        score: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);
      submissionModel.findOne.mockResolvedValue(null);
      submissionModel.create.mockResolvedValue(savedDoc);

      const result = await service.submit(
        'assignment-uuid',
        'student-uuid',
        dto,
      );

      expect(result).toEqual(savedDoc);
      expect(assignmentsService.findOne).toHaveBeenCalledWith(
        'assignment-uuid',
      );
      expect(enrollmentsService.isEnrolled).toHaveBeenCalledWith(
        'student-uuid',
        'course-uuid',
      );
    });

    it('수강하지 않은 학생이면 ForbiddenException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(false);

      await expect(
        service.submit('assignment-uuid', 'student-uuid', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('이미 제출한 과제이면 ConflictException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);
      submissionModel.findOne.mockResolvedValue({ _id: 'existing' });

      await expect(
        service.submit('assignment-uuid', 'student-uuid', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('MongoDB unique index 위반 시 ConflictException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);
      submissionModel.findOne.mockResolvedValue(null);

      const mongoError = new Error('E11000 duplicate key error');
      Object.assign(mongoError, { code: 11000 });
      submissionModel.create.mockRejectedValue(mongoError);

      await expect(
        service.submit('assignment-uuid', 'student-uuid', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('과제를 찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockRejectedValue(new NotFoundException());

      await expect(
        service.submit('nonexistent', 'student-uuid', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('마감일이 지난 과제에 제출하면 BadRequestException을 던져야 한다', async () => {
      const pastDueAssignment = {
        ...mockAssignment,
        dueDate: new Date('2020-01-01'),
      };
      assignmentsService.findOne!.mockResolvedValue(pastDueAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);

      await expect(
        service.submit('assignment-uuid', 'student-uuid', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('마감일이 없는 과제는 제출할 수 있어야 한다', async () => {
      const noDueAssignment = {
        ...mockAssignment,
        dueDate: null,
      };
      const savedDoc = {
        _id: { toString: () => 'submission-id' },
        studentId: 'student-uuid',
        assignmentId: 'assignment-uuid',
        content: dto.content,
        fileUrls: [],
        status: SubmissionStatus.SUBMITTED,
      };

      assignmentsService.findOne!.mockResolvedValue(noDueAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);
      submissionModel.findOne.mockResolvedValue(null);
      submissionModel.create.mockResolvedValue(savedDoc);

      const result = await service.submit(
        'assignment-uuid',
        'student-uuid',
        dto,
      );
      expect(result).toEqual(savedDoc);
    });

    it('fileUrls가 포함된 제출을 생성해야 한다', async () => {
      const dtoWithFiles: CreateSubmissionDto = {
        content: '답안',
        fileUrls: ['https://example.com/file.pdf'],
      };
      const savedDoc = {
        _id: { toString: () => 'submission-id' },
        studentId: 'student-uuid',
        assignmentId: 'assignment-uuid',
        content: dtoWithFiles.content,
        fileUrls: dtoWithFiles.fileUrls,
        status: SubmissionStatus.SUBMITTED,
        feedback: null,
        score: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);
      submissionModel.findOne.mockResolvedValue(null);
      submissionModel.create.mockResolvedValue(savedDoc);

      const result = await service.submit(
        'assignment-uuid',
        'student-uuid',
        dtoWithFiles,
      );

      expect(result.fileUrls).toEqual(['https://example.com/file.pdf']);
    });
  });

  // --- findByAssignment ---

  describe('findByAssignment', () => {
    it('Tutor가 과제의 모든 제출을 조회해야 한다', async () => {
      const submissions = [
        { _id: 's1', studentId: 'student-1' },
        { _id: 's2', studentId: 'student-2' },
      ];

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(submissions),
        }),
      });

      const result = await service.findByAssignment(
        'assignment-uuid',
        'tutor-uuid',
        Role.TUTOR,
      );

      expect(result).toEqual(submissions);
      expect(submissionModel.find).toHaveBeenCalledWith({
        assignmentId: 'assignment-uuid',
      });
    });

    it('학생이 본인의 제출만 조회해야 한다', async () => {
      const submissions = [{ _id: 's1', studentId: 'student-uuid' }];

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);
      submissionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(submissions),
        }),
      });

      const result = await service.findByAssignment(
        'assignment-uuid',
        'student-uuid',
        Role.STUDENT,
      );

      expect(result).toEqual(submissions);
      expect(submissionModel.find).toHaveBeenCalledWith({
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
      });
    });

    it('수강하지 않은 학생이면 ForbiddenException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      enrollmentsService.isEnrolled!.mockResolvedValue(false);

      await expect(
        service.findByAssignment(
          'assignment-uuid',
          'student-uuid',
          Role.STUDENT,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('소유자가 아닌 Tutor이면 ForbiddenException을 던져야 한다', async () => {
      assignmentsService.findOne!.mockResolvedValue(mockAssignment);

      await expect(
        service.findByAssignment('assignment-uuid', 'other-tutor', Role.TUTOR),
      ).rejects.toThrow(ForbiddenException);
    });

  });

  // --- addFeedback ---

  describe('addFeedback', () => {
    const feedbackDto: AddFeedbackDto = {
      feedback: '잘 작성하셨습니다.',
      score: 95,
    };

    it('Tutor가 피드백을 추가하고 REVIEWED로 상태를 변경해야 한다', async () => {
      const submission: MockSubmission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        status: SubmissionStatus.SUBMITTED,
        save: jest.fn(),
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.findById.mockResolvedValue(submission);
      submission.save.mockResolvedValue({
        ...submission,
        feedback: feedbackDto.feedback,
        score: feedbackDto.score,
        status: SubmissionStatus.REVIEWED,
        reviewedAt: expect.any(Date) as Date,
      });

      await service.addFeedback(
        'submission-id',
        'assignment-uuid',
        'tutor-uuid',
        Role.TUTOR,
        feedbackDto,
      );

      expect(submission.feedback).toBe('잘 작성하셨습니다.');
      expect(submission.score).toBe(95);
      expect(submission.status).toBe(SubmissionStatus.REVIEWED);
      expect(submission.save).toHaveBeenCalled();
    });

    it('score 없이 피드백을 추가하면 RETURNED로 상태를 변경해야 한다', async () => {
      const submission: MockSubmission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        status: SubmissionStatus.SUBMITTED,
        save: jest.fn(),
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.findById.mockResolvedValue(submission);
      submission.save.mockResolvedValue(submission);

      await service.addFeedback(
        'submission-id',
        'assignment-uuid',
        'tutor-uuid',
        Role.TUTOR,
        {
          feedback: '수정이 필요합니다.',
        },
      );

      expect(submission.status).toBe(SubmissionStatus.RETURNED);
    });

    it('소유자가 아닌 Tutor이면 ForbiddenException을 던져야 한다', async () => {
      const submission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        status: SubmissionStatus.SUBMITTED,
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.findById.mockResolvedValue(submission);

      await expect(
        service.addFeedback(
          'submission-id',
          'assignment-uuid',
          'other-tutor',
          Role.TUTOR,
          feedbackDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('제출을 찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      submissionModel.findById.mockResolvedValue(null);

      await expect(
        service.addFeedback(
          'nonexistent',
          'assignment-uuid',
          'tutor-uuid',
          Role.TUTOR,
          feedbackDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('이미 REVIEWED 상태인 제출에 피드백을 추가하면 ConflictException을 던져야 한다', async () => {
      const submission: MockSubmission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        status: SubmissionStatus.REVIEWED,
        save: jest.fn(),
      };

      submissionModel.findById.mockResolvedValue(submission);

      await expect(
        service.addFeedback(
          'submission-id',
          'assignment-uuid',
          'tutor-uuid',
          Role.TUTOR,
          feedbackDto,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('RETURNED 상태 제출에는 피드백을 추가할 수 있어야 한다', async () => {
      const submission: MockSubmission = {
        _id: 'submission-id',
        assignmentId: 'assignment-uuid',
        studentId: 'student-uuid',
        status: SubmissionStatus.RETURNED,
        save: jest.fn(),
      };

      assignmentsService.findOne!.mockResolvedValue(mockAssignment);
      submissionModel.findById.mockResolvedValue(submission);
      submission.save.mockResolvedValue(submission);

      await service.addFeedback(
        'submission-id',
        'assignment-uuid',
        'tutor-uuid',
        Role.TUTOR,
        feedbackDto,
      );

      expect(submission.save).toHaveBeenCalled();
    });

    it('URL의 assignmentId와 제출의 assignmentId가 다르면 BadRequestException을 던져야 한다', async () => {
      const submission: MockSubmission = {
        _id: 'submission-id',
        assignmentId: 'different-assignment-uuid',
        studentId: 'student-uuid',
        status: SubmissionStatus.SUBMITTED,
        save: jest.fn(),
      };

      submissionModel.findById.mockResolvedValue(submission);

      await expect(
        service.addFeedback(
          'submission-id',
          'assignment-uuid',
          'tutor-uuid',
          Role.TUTOR,
          feedbackDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

  });
});
