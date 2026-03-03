import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Submission, SubmissionSchema } from './schemas/submission.schema.js';
import { SubmissionsService } from './submissions.service.js';
import { SubmissionsController } from './submissions.controller.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { SubmissionAccessPolicy } from './policies/submission-access.policy.js';
import { CommonPoliciesModule } from '../common/policies/common-policies.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    AssignmentsModule,
    CommonPoliciesModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionAccessPolicy],
})
export class SubmissionsModule {}
