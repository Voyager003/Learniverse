import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { AdminAuditLog } from './entities/admin-audit-log.entity.js';
import { AdminAuditService } from './admin-audit.service.js';

type MockRepository = Partial<
  Record<keyof Repository<AdminAuditLog>, jest.Mock>
>;
type FindAndCountOptions = {
  where: Record<string, unknown>;
  order: Record<string, string>;
  skip: number;
  take: number;
};

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let repository: MockRepository;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        {
          provide: getRepositoryToken(AdminAuditLog),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<AdminAuditService>(AdminAuditService);
  });

  describe('record', () => {
    it('감사 로그를 생성하고 저장해야 한다', async () => {
      const createdLog = {
        actorId: 'admin-uuid',
        action: 'admin.login',
        resourceType: 'auth',
        resourceId: 'admin-uuid',
        beforeState: null,
        afterState: { role: 'admin' },
        metadata: { email: 'admin@example.com' },
      } as AdminAuditLog;
      repository.create!.mockReturnValue(createdLog);
      repository.save!.mockResolvedValue(createdLog);

      const result = await service.record({
        actorId: 'admin-uuid',
        action: 'admin.login',
        resourceType: 'auth',
        resourceId: 'admin-uuid',
        afterState: { role: 'admin' },
        metadata: { email: 'admin@example.com' },
      });

      expect(repository.create).toHaveBeenCalledWith({
        actorId: 'admin-uuid',
        action: 'admin.login',
        resourceType: 'auth',
        resourceId: 'admin-uuid',
        beforeState: null,
        afterState: { role: 'admin' },
        metadata: { email: 'admin@example.com' },
      });
      expect(repository.save).toHaveBeenCalledWith(createdLog);
      expect(result).toBe(createdLog);
    });
  });

  describe('findAll', () => {
    it('필터 없이 페이지네이션 결과를 반환해야 한다', async () => {
      const logs = [
        {
          id: 'log-1',
          actorId: 'admin-uuid',
          action: 'admin.login',
          resourceType: 'auth',
          resourceId: 'admin-uuid',
          createdAt: new Date('2026-03-08T00:00:00.000Z'),
        },
      ] as AdminAuditLog[];
      repository.findAndCount!.mockResolvedValue([logs, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual(logs);
      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('actorId, action, resourceType, 기간 필터를 적용해야 한다', async () => {
      repository.findAndCount!.mockResolvedValue([[] as AdminAuditLog[], 0]);

      await service.findAll({
        actorId: 'admin-uuid',
        action: 'users.deactivate',
        resourceType: 'user',
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-08T00:00:00.000Z',
        page: 2,
        limit: 20,
      });

      const findAndCountMock = repository.findAndCount as jest.MockedFunction<
        (options: FindAndCountOptions) => Promise<[AdminAuditLog[], number]>
      >;
      const firstCall = findAndCountMock.mock.calls[0];
      expect(firstCall).toBeDefined();

      const [options] = firstCall as [FindAndCountOptions];

      expect(options.where.actorId).toBe('admin-uuid');
      expect(options.where.action).toBe('users.deactivate');
      expect(options.where.resourceType).toBe('user');
      expect(options.where.createdAt).toBeDefined();
      expect(options.order).toEqual({ createdAt: 'DESC' });
      expect(options.skip).toBe(20);
      expect(options.take).toBe(20);
    });
  });
});
