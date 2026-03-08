import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service.js';
import { Role } from '../common/enums/index.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';

jest.mock('bcrypt');

const mockedHash = bcrypt.hash as jest.Mock;

describe('AdminBootstrapService', () => {
  let service: AdminBootstrapService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    authService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBootstrapService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<AdminBootstrapService>(AdminBootstrapService);
    mockedHash.mockReset();
  });

  it('관리자 계정이 없으면 새로 생성해야 한다', async () => {
    usersService.findByEmail!.mockResolvedValue(null);
    mockedHash.mockResolvedValue('hashed-password');
    usersService.create!.mockResolvedValue({
      id: 'admin-uuid',
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
    } as User);

    const result = await service.ensureAdminUser({
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
    });

    expect(result.created).toBe(true);
    expect(usersService.create).toHaveBeenCalledWith({
      email: 'admin@example.com',
      passwordHash: 'hashed-password',
      name: 'Admin User',
      role: Role.ADMIN,
    });
  });

  it('이미 관리자 계정이 있으면 재생성하지 않아야 한다', async () => {
    const existingAdmin = {
      id: 'admin-uuid',
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
      isActive: true,
    } as User;
    usersService.findByEmail!.mockResolvedValue(existingAdmin);

    const result = await service.ensureAdminUser({
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
    });

    expect(result.created).toBe(false);
    expect(result.user).toBe(existingAdmin);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('같은 이메일의 일반 계정이 있으면 실패해야 한다', async () => {
    usersService.findByEmail!.mockResolvedValue({
      id: 'user-uuid',
      email: 'admin@example.com',
      role: Role.TUTOR,
    } as User);

    await expect(
      service.ensureAdminUser({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
