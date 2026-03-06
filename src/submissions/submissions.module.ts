import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission, SubmissionSchema } from './schemas/submission.schema.js';
import { SubmissionsService } from './submissions.service.js';
import { SubmissionsController } from './submissions.controller.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { CommonPoliciesModule } from '../common/policies/common-policies.module.js';
import { IdempotencyModule } from '../common/idempotency/idempotency.module.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    TypeOrmModule.forFeature([User]),
    AssignmentsModule,
    CommonPoliciesModule,
    IdempotencyModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
