import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Submission, SubmissionSchema } from './schemas/submission.schema.js';
import { SubmissionsService } from './submissions.service.js';
import { SubmissionsController } from './submissions.controller.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { SubmissionAccessPolicy } from './policies/submission-access.policy.js';
import { CourseEnrollmentPolicy } from '../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../common/policies/course-ownership.policy.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    AssignmentsModule,
    EnrollmentsModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    SubmissionAccessPolicy,
    CourseEnrollmentPolicy,
    CourseOwnershipPolicy,
  ],
})
export class SubmissionsModule {}
