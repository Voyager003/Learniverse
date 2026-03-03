import { ForbiddenException, Injectable } from '@nestjs/common';
import { Course } from '../../courses/entities/course.entity.js';
import { EnrollmentsService } from '../../enrollments/enrollments.service.js';
import { Role } from '../../common/enums/index.js';
import { ERROR_MESSAGES } from '../../common/constants/error-messages.constant.js';

@Injectable()
export class AssignmentAccessPolicy {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  assertTutorOwnsCourse(course: Pick<Course, 'tutorId'>, userId: string): void {
    if (course.tutorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_COURSE_OWNER);
    }
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

    const enrolled = await this.enrollmentsService.isEnrolled(
      userId,
      course.id,
    );
    if (!enrolled) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
    }
  }
}
