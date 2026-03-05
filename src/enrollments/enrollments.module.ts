import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { EnrollmentsService } from './enrollments.service.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { IdempotencyModule } from '../common/idempotency/idempotency.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Course]), IdempotencyModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
