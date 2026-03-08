import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { Role } from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminUsersService } from './admin-users.service.js';

type MockRepository = Partial<Record<keyof Repository<User>, jest.Mock>>;

const adminUser: User = {
  id: 'admin-uuid',
  email: 'admin@example.com',
  passwordHash: 'hashed',
  name: 'Admin',
  role: Role.ADMIN,
  isActive: true,
  refreshToken: 'hashed-refresh',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
};

const studentUser: User = {
  id: 'student-uuid',
  email: 'student@example.com',
  passwordHash: 'hashed',
  name: 'Student',
  role: Role.STUDENT,
  isActive: true,
  refreshToken: 'hashed-refresh',
  createdAt: new Date('2026-03-02T00:00:00.000Z'),
  updatedAt: new Date('2026-03-02T00:00:00.000Z'),
};

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let repository: MockRepository;
  let adminAuditService: Partial<Record<keyof AdminAuditService, jest.Mock>>;

  beforeEach(async () => {
    repository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };
    adminAuditService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
        {
          provide: AdminAuditService,
          useValue: adminAuditService,
        },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  describe('findAll', () => {
    it('검색/필터를 반영한 페이지네이션 결과를 반환해야 한다', async () => {
      repository.findAndCount!.mockResolvedValue([[adminUser], 1]);

      const result = await service.findAll({
        search: 'admin',
        role: Role.ADMIN,
        isActive: true,
        page: 2,
        limit: 20,
      });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual([adminUser]);
      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: [
          {
            email: ILike('%admin%'),
            role: Role.ADMIN,
            isActive: true,
          },
          {
            name: ILike('%admin%'),
            role: Role.ADMIN,
            isActive: true,
          },
        ],
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 20,
      });
    });
  });

  describe('findById', () => {
    it('대상 사용자를 반환해야 한다', async () => {
      repository.findOne!.mockResolvedValue(studentUser);

      const result = await service.findById('student-uuid');

      expect(result).toBe(studentUser);
    });

    it('사용자가 없으면 NotFoundException을 던져야 한다', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('사용자 상태를 변경하고 감사 로그를 남겨야 한다', async () => {
      repository.findOne!.mockResolvedValue(studentUser);
      repository.save!.mockResolvedValue({
        ...studentUser,
        isActive: false,
        refreshToken: null,
      });
      adminAuditService.record!.mockResolvedValue(undefined);

      const result = await service.updateStatus('admin-uuid', 'student-uuid', {
        isActive: false,
        reason: 'abuse',
      });

      expect(result.isActive).toBe(false);
      expect(result.refreshToken).toBeNull();
      expect(adminAuditService.record).toHaveBeenCalledWith({
        actorId: 'admin-uuid',
        action: 'users.update_status',
        resourceType: 'user',
        resourceId: 'student-uuid',
        beforeState: { isActive: true },
        afterState: { isActive: false },
        metadata: { reason: 'abuse' },
      });
    });

    it('자기 자신을 비활성화하려 하면 실패해야 한다', async () => {
      await expect(
        service.updateStatus('admin-uuid', 'admin-uuid', {
          isActive: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('마지막 활성 관리자를 비활성화하려 하면 실패해야 한다', async () => {
      repository.findOne!.mockResolvedValue(adminUser);
      repository.count!.mockResolvedValue(1);

      await expect(
        service.updateStatus('other-admin', 'admin-uuid', {
          isActive: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateRole', () => {
    it('역할을 변경하고 감사 로그를 남겨야 한다', async () => {
      repository.findOne!.mockResolvedValue(studentUser);
      repository.save!.mockResolvedValue({
        ...studentUser,
        role: Role.TUTOR,
      });
      adminAuditService.record!.mockResolvedValue(undefined);

      const result = await service.updateRole('admin-uuid', 'student-uuid', {
        role: Role.TUTOR,
        reason: 'promotion',
      });

      expect(result.role).toBe(Role.TUTOR);
      expect(adminAuditService.record).toHaveBeenCalledWith({
        actorId: 'admin-uuid',
        action: 'users.update_role',
        resourceType: 'user',
        resourceId: 'student-uuid',
        beforeState: { role: Role.STUDENT },
        afterState: { role: Role.TUTOR },
        metadata: { reason: 'promotion' },
      });
    });

    it('자기 자신의 역할을 변경하려 하면 실패해야 한다', async () => {
      await expect(
        service.updateRole('admin-uuid', 'admin-uuid', { role: Role.TUTOR }),
      ).rejects.toThrow(BadRequestException);
    });

    it('마지막 활성 관리자를 비관리자로 변경하려 하면 실패해야 한다', async () => {
      repository.findOne!.mockResolvedValue(adminUser);
      repository.count!.mockResolvedValue(1);

      await expect(
        service.updateRole('other-admin', 'admin-uuid', { role: Role.TUTOR }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeSessions', () => {
    it('리프레시 토큰을 제거하고 감사 로그를 남겨야 한다', async () => {
      repository.findOne!.mockResolvedValue({
        ...studentUser,
        refreshToken: 'hashed-refresh',
      });
      repository.save!.mockResolvedValue({
        ...studentUser,
        refreshToken: null,
      });
      adminAuditService.record!.mockResolvedValue(undefined);

      await service.revokeSessions('admin-uuid', 'student-uuid');

      expect(repository.save).toHaveBeenCalledWith({
        ...studentUser,
        refreshToken: null,
      });
      expect(adminAuditService.record).toHaveBeenCalledWith({
        actorId: 'admin-uuid',
        action: 'users.revoke_sessions',
        resourceType: 'user',
        resourceId: 'student-uuid',
        beforeState: { hasRefreshToken: true },
        afterState: { hasRefreshToken: false },
        metadata: null,
      });
    });
  });
});
