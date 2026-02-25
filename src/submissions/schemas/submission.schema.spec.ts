import { Submission } from './submission.schema.js';
import { SubmissionStatus } from '../../common/enums/index.js';

describe('Submission 스키마', () => {
  it('기본값으로 제출을 생성해야 한다', () => {
    const submission = new Submission();

    expect(submission.status).toBe(SubmissionStatus.SUBMITTED);
    expect(submission.fileUrls).toEqual([]);
    expect(submission.feedback).toBeNull();
    expect(submission.score).toBeNull();
    expect(submission.reviewedAt).toBeNull();
  });

  it('지정된 값으로 제출을 생성해야 한다', () => {
    const submission = new Submission();
    submission.studentId = 'student-uuid';
    submission.assignmentId = 'assignment-uuid';
    submission.content = '과제 내용입니다.';
    submission.fileUrls = ['https://example.com/file1.pdf'];
    submission.status = SubmissionStatus.SUBMITTED;

    expect(submission.studentId).toBe('student-uuid');
    expect(submission.assignmentId).toBe('assignment-uuid');
    expect(submission.content).toBe('과제 내용입니다.');
    expect(submission.fileUrls).toEqual(['https://example.com/file1.pdf']);
    expect(submission.status).toBe(SubmissionStatus.SUBMITTED);
  });

  it('REVIEWED 상태와 피드백을 설정할 수 있어야 한다', () => {
    const submission = new Submission();
    submission.studentId = 'student-uuid';
    submission.assignmentId = 'assignment-uuid';
    submission.content = '과제 내용';
    submission.status = SubmissionStatus.REVIEWED;
    submission.feedback = '잘 작성하셨습니다.';
    submission.score = 95;
    submission.reviewedAt = new Date('2026-03-01');

    expect(submission.status).toBe(SubmissionStatus.REVIEWED);
    expect(submission.feedback).toBe('잘 작성하셨습니다.');
    expect(submission.score).toBe(95);
    expect(submission.reviewedAt).toEqual(new Date('2026-03-01'));
  });

  it('RETURNED 상태를 설정할 수 있어야 한다', () => {
    const submission = new Submission();
    submission.status = SubmissionStatus.RETURNED;
    submission.feedback = '수정이 필요합니다.';

    expect(submission.status).toBe(SubmissionStatus.RETURNED);
    expect(submission.feedback).toBe('수정이 필요합니다.');
  });

  it('여러 파일 URL을 설정할 수 있어야 한다', () => {
    const submission = new Submission();
    submission.fileUrls = [
      'https://example.com/file1.pdf',
      'https://example.com/file2.pdf',
      'https://example.com/file3.pdf',
    ];

    expect(submission.fileUrls).toHaveLength(3);
  });
});
