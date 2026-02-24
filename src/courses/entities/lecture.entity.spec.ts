import { Lecture } from './lecture.entity.js';
import { Course } from './course.entity.js';

describe('Lecture Entity', () => {
  it('should create a lecture with assigned values', () => {
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

  it('should allow nullable videoUrl', () => {
    const lecture = new Lecture();
    lecture.videoUrl = null;
    expect(lecture.videoUrl).toBeNull();
  });

  it('should allow setting course relation', () => {
    const lecture = new Lecture();
    const course = new Course();
    course.id = 'course-uuid';

    lecture.course = course;
    lecture.courseId = course.id;

    expect(lecture.course).toBe(course);
    expect(lecture.courseId).toBe('course-uuid');
  });

  it('should allow different order values', () => {
    const lecture = new Lecture();

    lecture.order = 0;
    expect(lecture.order).toBe(0);

    lecture.order = 99;
    expect(lecture.order).toBe(99);
  });
});
