import { SubmissionResponseDto } from './submission-response.dto.js';
import { SubmissionStatus } from '../../common/enums/index.js';
import { SubmissionDocument } from '../schemas/submission.schema.js';

describe('SubmissionResponseDto', () => {
  const mockDate = new Date('2026-01-01');

  const mockSubmission = {
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
    const dto = SubmissionResponseDto.from(
      mockSubmission as unknown as SubmissionDocument,
    );

    expect(dto).toBeInstanceOf(SubmissionResponseDto);
    expect(dto.id).toBe('submission-id');
    expect(dto.studentId).toBe('student-uuid');
    expect(dto.studentName).toBeUndefined();
    expect(dto.assignmentId).toBe('assignment-uuid');
    expect(dto.content).toBe('과제 답안입니다.');
    expect(dto.fileUrls).toEqual(['https://example.com/file.pdf']);
    expect(dto.status).toBe(SubmissionStatus.SUBMITTED);
    expect(dto.feedback).toBeNull();
    expect(dto.score).toBeNull();
  });

  it('REVIEWED 상태의 문서를 변환해야 한다', () => {
    const reviewed = {
      ...mockSubmission,
      status: SubmissionStatus.REVIEWED,
      feedback: '잘 작성하셨습니다.',
      score: 95,
      reviewedAt: new Date('2026-02-01'),
    };
    const dto = SubmissionResponseDto.from(
      reviewed as unknown as SubmissionDocument,
    );

    expect(dto.status).toBe(SubmissionStatus.REVIEWED);
    expect(dto.feedback).toBe('잘 작성하셨습니다.');
    expect(dto.score).toBe(95);
    expect(dto.reviewedAt).toEqual(new Date('2026-02-01'));
  });

  it('studentName이 포함된 문서를 변환해야 한다', () => {
    const submissionWithStudentName = {
      ...mockSubmission,
      studentName: '홍길동',
    } as unknown as SubmissionDocument & { studentName: string };
    const dto = SubmissionResponseDto.from(submissionWithStudentName);

    expect(dto.studentName).toBe('홍길동');
  });

  it('배열을 변환해야 한다', () => {
    const dtos = SubmissionResponseDto.fromMany([
      mockSubmission as unknown as SubmissionDocument,
      mockSubmission as unknown as SubmissionDocument,
    ]);

    expect(dtos).toHaveLength(2);
    expect(dtos[0]).toBeInstanceOf(SubmissionResponseDto);
  });
});
