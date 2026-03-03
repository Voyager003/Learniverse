import { Injectable } from '@nestjs/common';
import { Course } from '../../courses/entities/course.entity.js';
import { Role } from '../../common/enums/index.js';
import { CourseEnrollmentPolicy } from '../../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../../common/policies/course-ownership.policy.js';

@Injectable()
export class AssignmentAccessPolicy {
  constructor(
    private readonly courseEnrollmentPolicy: CourseEnrollmentPolicy,
    private readonly courseOwnershipPolicy: CourseOwnershipPolicy,
  ) {}

  assertTutorOwnsCourse(course: Pick<Course, 'tutorId'>, userId: string): void {
    this.courseOwnershipPolicy.assertTutorOwnsCourse(course.tutorId, userId);
  }

  async assertCanReadCourseAssignments(
    course: Pick<Course, 'id' | 'tutorId'>,
    userId: string,
    role: Role,
  ): Promise<void> {
    if (role === Role.TUTOR) {
      this.assertTutorOwnsCourse(course, userId);
      return;
    }

    await this.courseEnrollmentPolicy.assertStudentEnrolled(userId, course.id);
  }
}
