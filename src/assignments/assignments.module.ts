import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignmentsController } from './assignments.controller.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { AssignmentAccessPolicy } from './policies/assignment-access.policy.js';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Course]), EnrollmentsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentAccessPolicy],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
