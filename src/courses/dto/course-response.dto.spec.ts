import { CourseResponseDto } from './course-response.dto.js';
import { Course } from '../entities/course.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  CourseCategory,
  CourseDifficulty,
  Role,
} from '../../common/enums/index.js';

describe('CourseResponseDto', () => {
  const createMockCourse = (): Course => {
    const tutor = new User();
    tutor.id = 'tutor-uuid';
    tutor.name = 'John Tutor';
    tutor.email = 'tutor@example.com';
    tutor.role = Role.TUTOR;

    const course = new Course();
    course.id = 'course-uuid';
    course.title = 'NestJS Fundamentals';
    course.description = 'Learn NestJS';
    course.category = CourseCategory.PROGRAMMING;
    course.difficulty = CourseDifficulty.BEGINNER;
    course.isPublished = true;
    course.tutorId = tutor.id;
    course.tutor = tutor;
    course.createdAt = new Date('2025-01-01');
    course.updatedAt = new Date('2025-01-02');

    return course;
  };

  it('should map course entity to response dto', () => {
    const course = createMockCourse();
    const dto = CourseResponseDto.from(course);

    expect(dto.id).toBe('course-uuid');
    expect(dto.title).toBe('NestJS Fundamentals');
    expect(dto.description).toBe('Learn NestJS');
    expect(dto.category).toBe(CourseCategory.PROGRAMMING);
    expect(dto.difficulty).toBe(CourseDifficulty.BEGINNER);
    expect(dto.isPublished).toBe(true);
    expect(dto.tutorId).toBe('tutor-uuid');
    expect(dto.tutorName).toBe('John Tutor');
    expect(dto.createdAt).toEqual(new Date('2025-01-01'));
    expect(dto.updatedAt).toEqual(new Date('2025-01-02'));
  });

  it('should map multiple courses with fromMany', () => {
    const courses = [createMockCourse(), createMockCourse()];
    courses[1].id = 'course-uuid-2';

    const dtos = CourseResponseDto.fromMany(courses);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('course-uuid');
    expect(dtos[1].id).toBe('course-uuid-2');
  });

  it('should handle course without tutor relation loaded', () => {
    const course = createMockCourse();
    course.tutor = undefined as unknown as User;

    const dto = CourseResponseDto.from(course);

    expect(dto.tutorName).toBeUndefined();
  });
});
