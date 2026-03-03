import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity.js';
import { Lecture } from './entities/lecture.entity.js';
import { CoursesService } from './courses.service.js';
import { CoursesController } from './courses.controller.js';
import { CourseAccessPolicy } from './policies/course-access.policy.js';
import { CourseOwnershipPolicy } from '../common/policies/course-ownership.policy.js';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lecture])],
  controllers: [CoursesController],
  providers: [CoursesService, CourseAccessPolicy, CourseOwnershipPolicy],
  exports: [CoursesService],
})
export class CoursesModule {}
