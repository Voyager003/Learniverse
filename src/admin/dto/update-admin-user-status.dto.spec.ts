import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAdminUserStatusDto } from './update-admin-user-status.dto.js';

describe('UpdateAdminUserStatusDto', () => {
  it('유효한 입력을 허용해야 한다', async () => {
    const dto = plainToInstance(UpdateAdminUserStatusDto, {
      isActive: false,
      reason: 'abuse',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
