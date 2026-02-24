import { Lecture } from './lecture.entity.js';
import { Course } from './course.entity.js';

describe('Lecture 엔티티', () => {
  it('지정된 값으로 강의를 생성해야 한다', () => {
    const lecture = new Lecture();
    lecture.title = 'Introduction to TypeScript';
    lecture.content = 'TypeScript basics and setup';
    lecture.videoUrl = 'https://example.com/video1';
    lecture.order = 1;

    expect(lecture.title).toBe('Introduction to TypeScript');
    expect(lecture.content).toBe('TypeScript basics and setup');
    expect(lecture.videoUrl).toBe('https://example.com/video1');
    expect(lecture.order).toBe(1);
  });

  it('videoUrl이 null을 허용해야 한다', () => {
    const lecture = new Lecture();
    lecture.videoUrl = null;
    expect(lecture.videoUrl).toBeNull();
  });

  it('course 관계를 설정할 수 있어야 한다', () => {
    const lecture = new Lecture();
    const course = new Course();
    course.id = 'course-uuid';

    lecture.course = course;
    lecture.courseId = course.id;

    expect(lecture.course).toBe(course);
    expect(lecture.courseId).toBe('course-uuid');
  });

  it('다양한 order 값을 허용해야 한다', () => {
    const lecture = new Lecture();

    lecture.order = 0;
    expect(lecture.order).toBe(0);

    lecture.order = 99;
    expect(lecture.order).toBe(99);
  });
});
