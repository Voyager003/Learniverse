import { ForbiddenException, Injectable } from '@nestjs/common';
import { EnrollmentsService } from '../../enrollments/enrollments.service.js';
import { Role } from '../../common/enums/index.js';
import { ERROR_MESSAGES } from '../../common/constants/error-messages.constant.js';
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
    private readonly enrollmentsService: EnrollmentsService,
    private readonly courseOwnershipPolicy: CourseOwnershipPolicy,
  ) {}

  assertTutorOwnsCourse(tutorId: string, userId: string): void {
    this.courseOwnershipPolicy.assertTutorOwnsCourse(tutorId, userId);
  }

  async assertStudentEnrolled(
    studentId: string,
    courseId: string,
  ): Promise<void> {
    const enrolled = await this.enrollmentsService.isEnrolled(
      studentId,
      courseId,
    );
    if (!enrolled) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
    }
  }

  async buildSubmissionFilter(
    input: BuildSubmissionFilterInput,
  ): Promise<SubmissionFilter> {
    const { assignmentId, courseId, courseTutorId, userId, role } = input;

    if (role === Role.TUTOR) {
      this.assertTutorOwnsCourse(courseTutorId, userId);
      return { assignmentId };
    }

    await this.assertStudentEnrolled(userId, courseId);
    return { assignmentId, studentId: userId };
  }
}
