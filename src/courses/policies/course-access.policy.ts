import { Injectable } from '@nestjs/common';
import { CourseOwnershipPolicy } from '../../common/policies/course-ownership.policy.js';

@Injectable()
export class CourseAccessPolicy {
  constructor(private readonly courseOwnershipPolicy: CourseOwnershipPolicy) {}

  assertTutorOwnsCourse(courseTutorId: string, userId: string): void {
    this.courseOwnershipPolicy.assertTutorOwnsCourse(courseTutorId, userId);
  }
}
