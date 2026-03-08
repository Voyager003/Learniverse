import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { User } from '../users/entities/user.entity.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AdminAuditModule } from './admin-audit.module.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UsersModule,
    AdminAuditModule,
  ],
  controllers: [
    AdminAuthController,
    AdminAuditController,
    AdminUsersController,
  ],
  providers: [AdminBootstrapService, AdminUsersService],
  exports: [AdminBootstrapService],
})
export class AdminModule {}
