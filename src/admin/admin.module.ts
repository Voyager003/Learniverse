import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AdminAuditModule } from './admin-audit.module.js';

@Module({
  imports: [AuthModule, UsersModule, AdminAuditModule],
  controllers: [AdminAuthController, AdminAuditController],
  providers: [AdminBootstrapService],
  exports: [AdminBootstrapService],
})
export class AdminModule {}
