import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsService } from './submissions.service.js';
import { SubmissionResponseDto } from './dto/submission-response.dto.js';
import { SubmissionStatus, Role } from '../common/enums/index.js';

const mockDate = new Date('2026-01-01');

const mockSubmissionDoc = {
  _id: { toString: () => 'submission-id' },
  studentId: 'student-uuid',
  assignmentId: 'assignment-uuid',
  content: '과제 답안입니다.',
  fileUrls: ['https://example.com/file.pdf'],
  status: SubmissionStatus.SUBMITTED,
  feedback: null,
  score: null,
  reviewedAt: null,
  createdAt: mockDate,
  updatedAt: mockDate,
};

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let submissionsService: Partial<Record<keyof SubmissionsService, jest.Mock>>;

  const mockReqStudent = {
    user: {
      userId: 'student-uuid',
      email: 'student@example.com',
      role: Role.STUDENT,
    },
  };

  const mockReqTutor = {
    user: {
      userId: 'tutor-uuid',
      email: 'tutor@example.com',
      role: Role.TUTOR,
    },
  };

  beforeEach(async () => {
    submissionsService = {
      submit: jest.fn(),
      findByAssignment: jest.fn(),
      addFeedback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        { provide: SubmissionsService, useValue: submissionsService },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  describe('POST /assignments/:aid/submissions', () => {
    it('제출하고 SubmissionResponseDto를 반환해야 한다', async () => {
      submissionsService.submit!.mockResolvedValue(mockSubmissionDoc);

      const dto = { content: '과제 답안입니다.' };
      const result = await controller.submit(
        mockReqStudent,
        'assignment-uuid',
        dto,
      );

      expect(result).toBeInstanceOf(SubmissionResponseDto);
      expect(result.id).toBe('submission-id');
      expect(result.content).toBe('과제 답안입니다.');
      expect(submissionsService.submit).toHaveBeenCalledWith(
        'assignment-uuid',
        'student-uuid',
        dto,
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      submissionsService.submit!.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.submit(mockReqStudent, 'assignment-uuid', {
          content: 'x',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ConflictException을 전파해야 한다', async () => {
      submissionsService.submit!.mockRejectedValue(new ConflictException());

      await expect(
        controller.submit(mockReqStudent, 'assignment-uuid', {
          content: 'x',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('GET /assignments/:aid/submissions', () => {
    it('SubmissionResponseDto 배열을 반환해야 한다', async () => {
      submissionsService.findByAssignment!.mockResolvedValue([
        mockSubmissionDoc,
      ]);

      const result = await controller.findByAssignment(
        mockReqTutor,
        'assignment-uuid',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(SubmissionResponseDto);
      expect(submissionsService.findByAssignment).toHaveBeenCalledWith(
        'assignment-uuid',
        'tutor-uuid',
        Role.TUTOR,
      );
    });

    it('제출이 없으면 빈 배열을 반환해야 한다', async () => {
      submissionsService.findByAssignment!.mockResolvedValue([]);

      const result = await controller.findByAssignment(
        mockReqStudent,
        'assignment-uuid',
      );

      expect(result).toHaveLength(0);
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      submissionsService.findByAssignment!.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        controller.findByAssignment(mockReqStudent, 'assignment-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /assignments/:aid/submissions/:sid/feedback', () => {
    it('피드백을 추가하고 SubmissionResponseDto를 반환해야 한다', async () => {
      const reviewedDoc = {
        ...mockSubmissionDoc,
        status: SubmissionStatus.REVIEWED,
        feedback: '잘 작성하셨습니다.',
        score: 95,
        reviewedAt: new Date('2026-02-01'),
      };
      submissionsService.addFeedback!.mockResolvedValue(reviewedDoc);

      const dto = { feedback: '잘 작성하셨습니다.', score: 95 };
      const result = await controller.addFeedback(
        mockReqTutor,
        'assignment-uuid',
        'submission-id',
        dto,
      );

      expect(result).toBeInstanceOf(SubmissionResponseDto);
      expect(result.status).toBe(SubmissionStatus.REVIEWED);
      expect(result.feedback).toBe('잘 작성하셨습니다.');
      expect(submissionsService.addFeedback).toHaveBeenCalledWith(
        'submission-id',
        'assignment-uuid',
        'tutor-uuid',
        Role.TUTOR,
        dto,
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      submissionsService.addFeedback!.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        controller.addFeedback(
          mockReqTutor,
          'assignment-uuid',
          'submission-id',
          { feedback: 'x' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NotFoundException을 전파해야 한다', async () => {
      submissionsService.addFeedback!.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.addFeedback(mockReqTutor, 'assignment-uuid', 'nonexistent', {
          feedback: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
