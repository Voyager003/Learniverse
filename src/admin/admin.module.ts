import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { AdminAuthController } from './auth/admin-auth.controller.js';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AdminAuthController],
  providers: [AdminBootstrapService],
  exports: [AdminBootstrapService],
})
export class AdminModule {}
