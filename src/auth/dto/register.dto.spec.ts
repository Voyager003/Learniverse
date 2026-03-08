import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '../../common/enums/index.js';
import { RegisterDto } from './register.dto.js';

describe('RegisterDto', () => {
  const validInput = {
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
  };

  it('student role로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validInput,
      role: Role.STUDENT,
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('tutor role로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validInput,
      role: Role.TUTOR,
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('admin role로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validInput,
      role: Role.ADMIN,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
