import { ForbiddenException, Injectable } from '@nestjs/common';
import { EnrollmentsService } from '../../enrollments/enrollments.service.js';
import { ERROR_MESSAGES } from '../constants/error-messages.constant.js';

@Injectable()
export class CourseEnrollmentPolicy {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

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
}
