import { CourseResponseDto } from './course-response.dto.js';
import { LectureResponseDto } from './lecture-response.dto.js';
import { Course } from '../entities/course.entity.js';
import { Lecture } from '../entities/lecture.entity.js';
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

  it('Course 엔티티를 응답 DTO로 매핑해야 한다', () => {
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

  it('fromMany로 여러 강좌를 매핑해야 한다', () => {
    const courses = [createMockCourse(), createMockCourse()];
    courses[1].id = 'course-uuid-2';

    const dtos = CourseResponseDto.fromMany(courses);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('course-uuid');
    expect(dtos[1].id).toBe('course-uuid-2');
  });

  it('tutor 관계가 로드되지 않은 강좌를 처리해야 한다', () => {
    const course = createMockCourse();
    course.tutor = undefined as unknown as User;

    const dto = CourseResponseDto.from(course);

    expect(dto.tutorName).toBeUndefined();
  });

  it('관계가 로드된 경우 lectures를 매핑해야 한다', () => {
    const course = createMockCourse();
    const lecture = new Lecture();
    lecture.id = 'lecture-uuid';
    lecture.title = 'Lecture 1';
    lecture.content = 'Content';
    lecture.videoUrl = null;
    lecture.order = 1;
    lecture.courseId = 'course-uuid';
    lecture.createdAt = new Date('2025-01-01');
    lecture.updatedAt = new Date('2025-01-01');
    course.lectures = [lecture];

    const dto = CourseResponseDto.from(course);

    expect(dto.lectures).toHaveLength(1);
    expect(dto.lectures![0]).toBeInstanceOf(LectureResponseDto);
    expect(dto.lectures![0].id).toBe('lecture-uuid');
  });

  it('관계가 로드되지 않은 경우 lectures를 undefined로 설정해야 한다', () => {
    const course = createMockCourse();
    // lectures not loaded (undefined)

    const dto = CourseResponseDto.from(course);

    expect(dto.lectures).toBeUndefined();
  });
});
