import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../../enrollments/enrollments.module.js';
import { CourseEnrollmentPolicy } from './course-enrollment.policy.js';
import { CourseOwnershipPolicy } from './course-ownership.policy.js';

@Module({
  imports: [EnrollmentsModule],
  providers: [CourseOwnershipPolicy, CourseEnrollmentPolicy],
  exports: [CourseOwnershipPolicy, CourseEnrollmentPolicy],
})
export class CommonPoliciesModule {}
