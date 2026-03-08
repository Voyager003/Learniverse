import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { Role } from '../common/enums/index.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { User } from '../users/entities/user.entity.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { UpdateAdminUserRoleDto } from './dto/update-admin-user-role.dto.js';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto.js';

const adminReq = {
  user: {
    userId: 'admin-uuid',
    email: 'admin@example.com',
    role: Role.ADMIN,
  },
};

const mockUser: User = {
  id: 'student-uuid',
  email: 'student@example.com',
  passwordHash: 'hashed',
  name: 'Student',
  role: Role.STUDENT,
  isActive: true,
  refreshToken: null,
  createdAt: new Date('2026-03-02T00:00:00.000Z'),
  updatedAt: new Date('2026-03-02T00:00:00.000Z'),
};

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let adminUsersService: Partial<Record<keyof AdminUsersService, jest.Mock>>;

  beforeEach(async () => {
    adminUsersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateRole: jest.fn(),
      revokeSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: AdminUsersService, useValue: adminUsersService }],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('목록 조회는 UserResponseDto 페이지네이션을 반환해야 한다', async () => {
    const query: AdminUserQueryDto = { page: 1, limit: 10 };
    adminUsersService.findAll!.mockResolvedValue(
      new PaginatedResponseDto([mockUser], 1, 1, 10),
    );

    const result = await controller.findAll(query);

    expect(result.data[0]).toBeInstanceOf(UserResponseDto);
    expect(adminUsersService.findAll).toHaveBeenCalledWith(query);
  });

  it('상세 조회는 UserResponseDto를 반환해야 한다', async () => {
    adminUsersService.findById!.mockResolvedValue(mockUser);

    const result = await controller.findById('student-uuid');

    expect(result).toBeInstanceOf(UserResponseDto);
    expect(adminUsersService.findById).toHaveBeenCalledWith('student-uuid');
  });

  it('상태 변경은 actorId와 함께 service를 호출해야 한다', async () => {
    const dto: UpdateAdminUserStatusDto = { isActive: false, reason: 'abuse' };
    adminUsersService.updateStatus!.mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    const result = await controller.updateStatus(adminReq, 'student-uuid', dto);

    expect(result.isActive).toBe(false);
    expect(adminUsersService.updateStatus).toHaveBeenCalledWith(
      'admin-uuid',
      'student-uuid',
      dto,
    );
  });

  it('역할 변경은 actorId와 함께 service를 호출해야 한다', async () => {
    const dto: UpdateAdminUserRoleDto = {
      role: Role.TUTOR,
      reason: 'promotion',
    };
    adminUsersService.updateRole!.mockResolvedValue({
      ...mockUser,
      role: Role.TUTOR,
    });

    const result = await controller.updateRole(adminReq, 'student-uuid', dto);

    expect(result.role).toBe(Role.TUTOR);
    expect(adminUsersService.updateRole).toHaveBeenCalledWith(
      'admin-uuid',
      'student-uuid',
      dto,
    );
  });

  it('세션 강제 해제는 service를 호출해야 한다', async () => {
    adminUsersService.revokeSessions!.mockResolvedValue(undefined);

    await controller.revokeSessions(adminReq, 'student-uuid');

    expect(adminUsersService.revokeSessions).toHaveBeenCalledWith(
      'admin-uuid',
      'student-uuid',
    );
  });
});
