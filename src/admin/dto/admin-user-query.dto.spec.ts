import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '../../common/enums/index.js';
import { AdminUserQueryDto } from './admin-user-query.dto.js';

describe('AdminUserQueryDto', () => {
  it('유효한 필터를 허용해야 한다', async () => {
    const dto = plainToInstance(AdminUserQueryDto, {
      search: 'admin',
      role: Role.ADMIN,
      isActive: 'true',
      page: '2',
      limit: '20',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.isActive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
  });
});
