import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { Role } from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { UpdateAdminUserRoleDto } from './dto/update-admin-user-role.dto.js';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto.js';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async findAll(query: AdminUserQueryDto): Promise<PaginatedResponseDto<User>> {
    const { page, limit, search, role, isActive } = query;
    const baseWhere: Partial<Pick<User, 'role' | 'isActive'>> = {};

    if (role !== undefined) {
      baseWhere.role = role;
    }

    if (isActive !== undefined) {
      baseWhere.isActive = isActive;
    }

    const where = search
      ? [
          { ...baseWhere, email: ILike(`%${search}%`) },
          { ...baseWhere, name: ILike(`%${search}%`) },
        ]
      : baseWhere;

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  async updateStatus(
    actorId: string,
    userId: string,
    dto: UpdateAdminUserStatusDto,
  ): Promise<User> {
    if (actorId === userId && dto.isActive === false) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF);
    }

    const user = await this.findById(userId);
    await this.assertLastActiveAdminRemains(user, dto.isActive, user.role);

    const beforeState = { isActive: user.isActive };
    user.isActive = dto.isActive;
    if (!dto.isActive) {
      user.refreshToken = null;
    }

    const updated = await this.usersRepository.save(user);
    await this.adminAuditService.record({
      actorId,
      action: 'users.update_status',
      resourceType: 'user',
      resourceId: userId,
      beforeState,
      afterState: { isActive: updated.isActive },
      metadata: dto.reason ? { reason: dto.reason } : null,
    });

    return updated;
  }

  async updateRole(
    actorId: string,
    userId: string,
    dto: UpdateAdminUserRoleDto,
  ): Promise<User> {
    if (actorId === userId) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_CHANGE_OWN_ROLE);
    }

    const user = await this.findById(userId);
    await this.assertLastActiveAdminRemains(user, user.isActive, dto.role);

    const beforeState = { role: user.role };
    user.role = dto.role;

    const updated = await this.usersRepository.save(user);
    await this.adminAuditService.record({
      actorId,
      action: 'users.update_role',
      resourceType: 'user',
      resourceId: userId,
      beforeState,
      afterState: { role: updated.role },
      metadata: dto.reason ? { reason: dto.reason } : null,
    });

    return updated;
  }

  async revokeSessions(actorId: string, userId: string): Promise<void> {
    const user = await this.findById(userId);
    const beforeState = { hasRefreshToken: user.refreshToken !== null };
    user.refreshToken = null;
    await this.usersRepository.save(user);
    await this.adminAuditService.record({
      actorId,
      action: 'users.revoke_sessions',
      resourceType: 'user',
      resourceId: userId,
      beforeState,
      afterState: { hasRefreshToken: false },
      metadata: null,
    });
  }

  private async assertLastActiveAdminRemains(
    user: User,
    nextIsActive: boolean,
    nextRole: Role,
  ): Promise<void> {
    const removesActiveAdmin =
      user.role === Role.ADMIN &&
      user.isActive &&
      (nextRole !== Role.ADMIN || nextIsActive === false);

    if (!removesActiveAdmin) {
      return;
    }

    const activeAdminCount = await this.usersRepository.count({
      where: { role: Role.ADMIN, isActive: true },
    });

    if (activeAdminCount <= 1) {
      throw new BadRequestException(ERROR_MESSAGES.LAST_ACTIVE_ADMIN_REQUIRED);
    }
  }
}
