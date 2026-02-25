import { getMetadataArgsStorage } from 'typeorm';
import { Assignment } from './assignment.entity.js';
import { Course } from '../../courses/entities/course.entity.js';

describe('Assignment 엔티티', () => {
  it('기본값으로 과제를 생성해야 한다', () => {
    const assignment = new Assignment();

    expect(assignment).toBeDefined();
    expect(assignment.dueDate).toBeUndefined();
  });

  it('지정된 값으로 과제를 생성해야 한다', () => {
    const assignment = new Assignment();
    assignment.title = 'NestJS 과제 1';
    assignment.description = 'Guard 구현하기';
    assignment.courseId = 'course-uuid';
    assignment.dueDate = new Date('2026-03-01');

    expect(assignment.title).toBe('NestJS 과제 1');
    expect(assignment.description).toBe('Guard 구현하기');
    expect(assignment.courseId).toBe('course-uuid');
    expect(assignment.dueDate).toEqual(new Date('2026-03-01'));
  });

  it('course 관계를 설정할 수 있어야 한다', () => {
    const assignment = new Assignment();
    const course = new Course();
    course.id = 'course-uuid';

    assignment.course = course;
    assignment.courseId = course.id;

    expect(assignment.course).toBe(course);
    expect(assignment.courseId).toBe('course-uuid');
  });

  it('dueDate가 null일 수 있어야 한다', () => {
    const assignment = new Assignment();
    assignment.title = '마감일 없는 과제';
    assignment.description = '설명';
    assignment.courseId = 'course-uuid';
    assignment.dueDate = null;

    expect(assignment.dueDate).toBeNull();
  });

  it('course_id 컬럼에 인덱스가 설정되어야 한다', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (index) => index.target === Assignment,
    );
    const courseIdIndex = indices.find(
      (index) =>
        Array.isArray(index.columns) && index.columns.includes('courseId'),
    );
    expect(courseIdIndex).toBeDefined();
  });
});
