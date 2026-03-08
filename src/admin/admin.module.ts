import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import {
  Submission,
  SubmissionSchema,
} from '../submissions/schemas/submission.schema.js';
import { UsersModule } from '../users/users.module.js';
import { User } from '../users/entities/user.entity.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AdminAuditModule } from './admin-audit.module.js';
import { AdminContentController } from './admin-content.controller.js';
import { AdminContentService } from './admin-content.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course, Assignment]),
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    AuthModule,
    UsersModule,
    AdminAuditModule,
  ],
  controllers: [
    AdminAuthController,
    AdminAuditController,
    AdminUsersController,
    AdminContentController,
  ],
  providers: [AdminBootstrapService, AdminUsersService, AdminContentService],
  exports: [AdminBootstrapService],
})
export class AdminModule {}
