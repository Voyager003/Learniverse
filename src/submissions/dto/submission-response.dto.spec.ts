import { SubmissionResponseDto } from './submission-response.dto.js';
import { SubmissionStatus } from '../../common/enums/index.js';

interface MockSubmissionDoc {
  _id: { toString(): string };
  studentId: string;
  assignmentId: string;
  content: string;
  fileUrls: string[];
  status: SubmissionStatus;
  feedback: string | null;
  score: number | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

describe('SubmissionResponseDto', () => {
  const mockDate = new Date('2026-01-01');

  const mockSubmission: MockSubmissionDoc = {
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

  it('Submission 문서를 SubmissionResponseDto로 변환해야 한다', () => {
    const dto = SubmissionResponseDto.from(mockSubmission);

    expect(dto).toBeInstanceOf(SubmissionResponseDto);
    expect(dto.id).toBe('submission-id');
    expect(dto.studentId).toBe('student-uuid');
    expect(dto.assignmentId).toBe('assignment-uuid');
    expect(dto.content).toBe('과제 답안입니다.');
    expect(dto.fileUrls).toEqual(['https://example.com/file.pdf']);
    expect(dto.status).toBe(SubmissionStatus.SUBMITTED);
    expect(dto.feedback).toBeNull();
    expect(dto.score).toBeNull();
  });

  it('REVIEWED 상태의 문서를 변환해야 한다', () => {
    const reviewed: MockSubmissionDoc = {
      ...mockSubmission,
      status: SubmissionStatus.REVIEWED,
      feedback: '잘 작성하셨습니다.',
      score: 95,
      reviewedAt: new Date('2026-02-01'),
    };
    const dto = SubmissionResponseDto.from(reviewed);

    expect(dto.status).toBe(SubmissionStatus.REVIEWED);
    expect(dto.feedback).toBe('잘 작성하셨습니다.');
    expect(dto.score).toBe(95);
    expect(dto.reviewedAt).toEqual(new Date('2026-02-01'));
  });

  it('배열을 변환해야 한다', () => {
    const dtos = SubmissionResponseDto.fromMany([
      mockSubmission,
      mockSubmission,
    ]);

    expect(dtos).toHaveLength(2);
    expect(dtos[0]).toBeInstanceOf(SubmissionResponseDto);
  });
});
