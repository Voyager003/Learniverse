import { Enrollment } from './enrollment.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { EnrollmentStatus } from '../../common/enums/index.js';

describe('Enrollment 엔티티', () => {
  it('기본값으로 수강을 생성해야 한다', () => {
    const enrollment = new Enrollment();

    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.progress).toBe(0);
  });

  it('지정된 값으로 수강을 생성해야 한다', () => {
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

  it('student 관계를 설정할 수 있어야 한다', () => {
    const enrollment = new Enrollment();
    const student = new User();
    student.id = 'student-uuid';

    enrollment.student = student;
    enrollment.studentId = student.id;

    expect(enrollment.student).toBe(student);
    expect(enrollment.studentId).toBe('student-uuid');
  });

  it('course 관계를 설정할 수 있어야 한다', () => {
    const enrollment = new Enrollment();
    const course = new Course();
    course.id = 'course-uuid';

    enrollment.course = course;
    enrollment.courseId = course.id;

    expect(enrollment.course).toBe(course);
    expect(enrollment.courseId).toBe('course-uuid');
  });

  it('COMPLETED 상태를 허용해야 한다', () => {
    const enrollment = new Enrollment();
    enrollment.status = EnrollmentStatus.COMPLETED;
    enrollment.progress = 100;

    expect(enrollment.status).toBe(EnrollmentStatus.COMPLETED);
    expect(enrollment.progress).toBe(100);
  });

  it('DROPPED 상태를 허용해야 한다', () => {
    const enrollment = new Enrollment();
    enrollment.status = EnrollmentStatus.DROPPED;

    expect(enrollment.status).toBe(EnrollmentStatus.DROPPED);
  });
});
