import { AssignmentResponseDto } from './assignment-response.dto.js';
import { Assignment } from '../entities/assignment.entity.js';
import { Course } from '../../courses/entities/course.entity.js';

describe('AssignmentResponseDto', () => {
  const mockDate = new Date('2026-01-01');
  const mockDueDate = new Date('2026-03-01');

  const mockCourse = {
    id: 'course-uuid',
    title: 'NestJS Fundamentals',
  } as Course;

  const mockAssignment: Assignment = {
    id: 'assignment-uuid',
    title: 'Guard 구현',
    description: 'JwtAuthGuard를 직접 구현해보세요.',
    courseId: 'course-uuid',
    course: mockCourse,
    dueDate: mockDueDate,
    isPublished: false,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  it('Assignment 엔티티를 AssignmentResponseDto로 변환해야 한다', () => {
    const dto = AssignmentResponseDto.from(mockAssignment);

    expect(dto).toBeInstanceOf(AssignmentResponseDto);
    expect(dto.id).toBe('assignment-uuid');
    expect(dto.title).toBe('Guard 구현');
    expect(dto.description).toBe('JwtAuthGuard를 직접 구현해보세요.');
    expect(dto.courseId).toBe('course-uuid');
    expect(dto.courseTitle).toBe('NestJS Fundamentals');
    expect(dto.dueDate).toEqual(mockDueDate);
    expect(dto.isPublished).toBe(false);
    expect(dto.createdAt).toEqual(mockDate);
  });

  it('course 관계가 없어도 변환해야 한다', () => {
    const assignment = {
      ...mockAssignment,
      course: undefined as unknown as Course,
    };
    const dto = AssignmentResponseDto.from(assignment);

    expect(dto.courseTitle).toBeUndefined();
  });

  it('dueDate가 null일 때 변환해야 한다', () => {
    const assignment = { ...mockAssignment, dueDate: null };
    const dto = AssignmentResponseDto.from(assignment);

    expect(dto.dueDate).toBeNull();
  });

  it('배열을 변환해야 한다', () => {
    const dtos = AssignmentResponseDto.fromMany([
      mockAssignment,
      mockAssignment,
    ]);

    expect(dtos).toHaveLength(2);
    expect(dtos[0]).toBeInstanceOf(AssignmentResponseDto);
  });
});
