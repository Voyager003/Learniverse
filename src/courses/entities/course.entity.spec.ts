import { Course } from './course.entity.js';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';
import { User } from '../../users/entities/user.entity.js';

describe('Course Entity', () => {
  it('should create a course with default values', () => {
    const course = new Course();
    course.title = 'NestJS Fundamentals';
    course.description = 'Learn NestJS from scratch';
    course.category = CourseCategory.PROGRAMMING;
    course.difficulty = CourseDifficulty.BEGINNER;

    expect(course.title).toBe('NestJS Fundamentals');
    expect(course.description).toBe('Learn NestJS from scratch');
    expect(course.category).toBe(CourseCategory.PROGRAMMING);
    expect(course.difficulty).toBe(CourseDifficulty.BEGINNER);
    expect(course.isPublished).toBe(false);
  });

  it('should allow setting isPublished to true', () => {
    const course = new Course();
    course.isPublished = true;
    expect(course.isPublished).toBe(true);
  });

  it('should allow setting tutor relation', () => {
    const course = new Course();
    const tutor = new User();
    tutor.id = 'tutor-uuid';

    course.tutor = tutor;
    course.tutorId = tutor.id;

    expect(course.tutor).toBe(tutor);
    expect(course.tutorId).toBe('tutor-uuid');
  });

  it('should allow all category values', () => {
    const course = new Course();

    for (const category of Object.values(CourseCategory)) {
      course.category = category;
      expect(course.category).toBe(category);
    }
  });

  it('should allow all difficulty values', () => {
    const course = new Course();

    for (const difficulty of Object.values(CourseDifficulty)) {
      course.difficulty = difficulty;
      expect(course.difficulty).toBe(difficulty);
    }
  });
});
