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
    it('Enrollment 엔티티를 응답 DTO로 매핑해야 한다', () => {
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

    it('student 관계가 로드된 경우 studentName을 포함해야 한다', () => {
      const student = new User();
      student.name = 'John Doe';
      const enrollment = createMockEnrollment({ student });

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.studentName).toBe('John Doe');
    });

    it('student 관계가 로드되지 않은 경우 studentName을 undefined로 남겨야 한다', () => {
      const enrollment = createMockEnrollment();

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.studentName).toBeUndefined();
    });

    it('course 관계가 로드된 경우 courseTitle을 포함해야 한다', () => {
      const course = new Course();
      course.title = 'NestJS Fundamentals';
      const enrollment = createMockEnrollment({ course });

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.courseTitle).toBe('NestJS Fundamentals');
    });

    it('course 관계가 로드되지 않은 경우 courseTitle을 undefined로 남겨야 한다', () => {
      const enrollment = createMockEnrollment();

      const dto = EnrollmentResponseDto.from(enrollment);

      expect(dto.courseTitle).toBeUndefined();
    });
  });

  describe('fromMany()', () => {
    it('수강 배열을 매핑해야 한다', () => {
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

    it('빈 입력에 대해 빈 배열을 반환해야 한다', () => {
      const dtos = EnrollmentResponseDto.fromMany([]);
      expect(dtos).toHaveLength(0);
    });
  });
});
