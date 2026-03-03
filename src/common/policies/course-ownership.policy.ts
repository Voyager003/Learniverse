import { ForbiddenException, Injectable } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/error-messages.constant.js';

@Injectable()
export class CourseOwnershipPolicy {
  assertTutorOwnsCourse(courseTutorId: string, userId: string): void {
    if (courseTutorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_COURSE_OWNER);
    }
  }
}
