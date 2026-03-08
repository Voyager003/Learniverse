import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/index.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto.js';
import { AdminAuditLogResponseDto } from './dto/admin-audit-log-response.dto.js';

describe('AdminAuditController', () => {
  let controller: AdminAuditController;
  let adminAuditService: Partial<Record<keyof AdminAuditService, jest.Mock>>;

  beforeEach(async () => {
    adminAuditService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuditController],
      providers: [{ provide: AdminAuditService, useValue: adminAuditService }],
    }).compile();

    controller = module.get<AdminAuditController>(AdminAuditController);
  });

  it('감사 로그 목록을 DTO 기반 페이지네이션으로 반환해야 한다', async () => {
    const query: AdminAuditLogQueryDto = { page: 1, limit: 10 };
    adminAuditService.findAll!.mockResolvedValue(
      new PaginatedResponseDto(
        [
          {
            id: 'log-1',
            actorId: 'admin-uuid',
            action: 'admin.login',
            resourceType: 'auth',
            resourceId: 'admin-uuid',
            beforeState: null,
            afterState: { role: Role.ADMIN },
            metadata: { email: 'admin@example.com' },
            createdAt: new Date('2026-03-08T00:00:00.000Z'),
          },
        ],
        1,
        1,
        10,
      ),
    );

    const result = await controller.findAll(query);

    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data[0]).toBeInstanceOf(AdminAuditLogResponseDto);
    expect(adminAuditService.findAll).toHaveBeenCalledWith(query);
  });
});
