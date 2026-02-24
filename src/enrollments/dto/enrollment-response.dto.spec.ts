import { EnrollmentResponseDto } from './enrollment-response.dto.js';
import { Enrollment } from '../entities/enrollment.entity.js';
import { EnrollmentStatus } from '../../common/enums/index.js';
import { User } from '../../users/entities/user.entity.js';
import { Course } from '../../courses/entities/course.entity.js';

describe('EnrollmentResponseDto', () => {
  const mockDate = new Date('2025-01-01');

  function createMockEnrollment(overrides?: Partial<Enrollment>): Enrollment {
    const enrollment = new Enrollment();
    enrollment.id = 'enrollment-uuid';
    enrollment.studentId = 'student-uuid';
    enrollment.courseId = 'course-uuid';
    enrollment.status = EnrollmentStatus.ACTIVE;
    enrollment.progress = 30;
    enrollment.createdAt = mockDate;
    enrollment.updatedAt = mockDate;
    Object.assign(enrollment, overrides);
    return enrollment;
  }

  describe('from()', () => {
    it('should map enrollment entity to response dto', () => {
      const enrollment = createMockEnrollment();
      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.id).toBe('enrollment-uuid');
      expect(dto.studentId).toBe('student-uuid');
      expect(dto.courseId).toBe('course-uuid');
      expect(dto.status).toBe(EnrollmentStatus.ACTIVE);
      expect(dto.progress).toBe(30);
      expect(dto.createdAt).toBe(mockDate);
      expect(dto.updatedAt).toBe(mockDate);
    });

    it('should include studentName when student relation is loaded', () => {
      const student = new User();
      student.name = 'John Doe';
      const enrollment = createMockEnrollment({ student });

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.studentName).toBe('John Doe');
    });

    it('should leave studentName undefined when student relation is not loaded', () => {
      const enrollment = createMockEnrollment();

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.studentName).toBeUndefined();
    });

    it('should include courseTitle when course relation is loaded', () => {
      const course = new Course();
      course.title = 'NestJS Fundamentals';
      const enrollment = createMockEnrollment({ course });

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.courseTitle).toBe('NestJS Fundamentals');
    });

    it('should leave courseTitle undefined when course relation is not loaded', () => {
      const enrollment = createMockEnrollment();

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.courseTitle).toBeUndefined();
    });
  });

  describe('fromMany()', () => {
    it('should map an array of enrollments', () => {
      const enrollments = [
        createMockEnrollment({ id: 'e1' }),
        createMockEnrollment({
          id: 'e2',
          status: EnrollmentStatus.COMPLETED,
          progress: 100,
        }),
      ];

      const dtos = EnrollmentResponseDto.fromMany(enrollments);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('e1');
      expect(dtos[1].id).toBe('e2');
      expect(dtos[1].status).toBe(EnrollmentStatus.COMPLETED);
      expect(dtos[1].progress).toBe(100);
    });

    it('should return empty array for empty input', () => {
      const dtos = EnrollmentResponseDto.fromMany([]);
      expect(dtos).toHaveLength(0);
    });
  });
});
