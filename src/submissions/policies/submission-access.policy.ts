import { Injectable } from '@nestjs/common';
import { Role } from '../../common/enums/index.js';
import { CourseEnrollmentPolicy } from '../../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../../common/policies/course-ownership.policy.js';

export interface SubmissionFilter {
  assignmentId: string;
  studentId?: string;
}

export interface BuildSubmissionFilterInput {
  assignmentId: string;
  courseId: string;
  courseTutorId: string;
  userId: string;
  role: Role;
}

@Injectable()
export class SubmissionAccessPolicy {
  constructor(
    private readonly courseEnrollmentPolicy: CourseEnrollmentPolicy,
    private readonly courseOwnershipPolicy: CourseOwnershipPolicy,
  ) {}

  async assertStudentEnrolled(
    studentId: string,
    courseId: string,
  ): Promise<void> {
    await this.courseEnrollmentPolicy.assertStudentEnrolled(
      studentId,
      courseId,
    );
  }

  async buildSubmissionFilter(
    input: BuildSubmissionFilterInput,
  ): Promise<SubmissionFilter> {
    const { assignmentId, courseId, courseTutorId, userId, role } = input;

    if (role === Role.TUTOR) {
      this.courseOwnershipPolicy.assertTutorOwnsCourse(courseTutorId, userId);
      return { assignmentId };
    }

    await this.assertStudentEnrolled(userId, courseId);
    return { assignmentId, studentId: userId };
  }
}
