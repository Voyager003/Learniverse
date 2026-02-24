import { LectureResponseDto } from './lecture-response.dto.js';
import { Lecture } from '../entities/lecture.entity.js';

describe('LectureResponseDto', () => {
  const createMockLecture = (): Lecture => {
    const lecture = new Lecture();
    lecture.id = 'lecture-uuid';
    lecture.title = 'Introduction to TypeScript';
    lecture.content = 'TypeScript basics';
    lecture.videoUrl = 'https://example.com/video1';
    lecture.order = 1;
    lecture.courseId = 'course-uuid';
    lecture.createdAt = new Date('2025-01-01');
    lecture.updatedAt = new Date('2025-01-02');
    return lecture;
  };

  it('should map lecture entity to response dto', () => {
    const lecture = createMockLecture();
    const dto = LectureResponseDto.from(lecture);

    expect(dto.id).toBe('lecture-uuid');
    expect(dto.title).toBe('Introduction to TypeScript');
    expect(dto.content).toBe('TypeScript basics');
    expect(dto.videoUrl).toBe('https://example.com/video1');
    expect(dto.order).toBe(1);
    expect(dto.courseId).toBe('course-uuid');
    expect(dto.createdAt).toEqual(new Date('2025-01-01'));
    expect(dto.updatedAt).toEqual(new Date('2025-01-02'));
  });

  it('should handle null videoUrl', () => {
    const lecture = createMockLecture();
    lecture.videoUrl = null;

    const dto = LectureResponseDto.from(lecture);
    expect(dto.videoUrl).toBeNull();
  });

  it('should map multiple lectures with fromMany', () => {
    const lectures = [createMockLecture(), createMockLecture()];
    lectures[1].id = 'lecture-uuid-2';
    lectures[1].order = 2;

    const dtos = LectureResponseDto.fromMany(lectures);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('lecture-uuid');
    expect(dtos[1].id).toBe('lecture-uuid-2');
  });
});
