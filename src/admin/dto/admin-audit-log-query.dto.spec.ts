import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminAuditLogQueryDto } from './admin-audit-log-query.dto.js';

describe('AdminAuditLogQueryDto', () => {
  it('유효한 필터와 페이지네이션을 허용해야 한다', async () => {
    const dto = plainToInstance(AdminAuditLogQueryDto, {
      actorId: 'admin-uuid',
      action: 'admin.login',
      resourceType: 'auth',
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-08T00:00:00.000Z',
      page: 2,
      limit: 20,
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
