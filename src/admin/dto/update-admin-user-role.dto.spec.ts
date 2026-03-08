import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '../../common/enums/index.js';
import { UpdateAdminUserRoleDto } from './update-admin-user-role.dto.js';

describe('UpdateAdminUserRoleDto', () => {
  it('admin 역할 변경 입력을 허용해야 한다', async () => {
    const dto = plainToInstance(UpdateAdminUserRoleDto, {
      role: Role.ADMIN,
      reason: 'promotion',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
