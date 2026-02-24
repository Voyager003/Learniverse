import { Enrollment } from './enrollment.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { EnrollmentStatus } from '../../common/enums/index.js';

describe('Enrollment Entity', () => {
  it('should create an enrollment with default values', () => {
    const enrollment = new Enrollment();

    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.progress).toBe(0);
  });

  it('should create an enrollment with assigned values', () => {
    const enrollment = new Enrollment();
    enrollment.studentId = 'student-uuid';
    enrollment.courseId = 'course-uuid';
    enrollment.status = EnrollmentStatus.ACTIVE;
    enrollment.progress = 50;

    expect(enrollment.studentId).toBe('student-uuid');
    expect(enrollment.courseId).toBe('course-uuid');
    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.progress).toBe(50);
  });

  it('should allow setting student relation', () => {
    const enrollment = new Enrollment();
    const student = new User();
    student.id = 'student-uuid';

    enrollment.student = student;
    enrollment.studentId = student.id;

    expect(enrollment.student).toBe(student);
    expect(enrollment.studentId).toBe('student-uuid');
  });

  it('should allow setting course relation', () => {
    const enrollment = new Enrollment();
    const course = new Course();
    course.id = 'course-uuid';

    enrollment.course = course;
    enrollment.courseId = course.id;

    expect(enrollment.course).toBe(course);
    expect(enrollment.courseId).toBe('course-uuid');
  });

  it('should allow COMPLETED status', () => {
    const enrollment = new Enrollment();
    enrollment.status = EnrollmentStatus.COMPLETED;
    enrollment.progress = 100;

    expect(enrollment.status).toBe(EnrollmentStatus.COMPLETED);
    expect(enrollment.progress).toBe(100);
  });

  it('should allow DROPPED status', () => {
    const enrollment = new Enrollment();
    enrollment.status = EnrollmentStatus.DROPPED;

    expect(enrollment.status).toBe(EnrollmentStatus.DROPPED);
  });
});
