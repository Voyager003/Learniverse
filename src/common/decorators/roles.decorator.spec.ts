import { SetMetadata } from '@nestjs/common';
import { Roles, ROLES_KEY } from './roles.decorator.js';
import { Role } from '../enums/index.js';

jest.mock('@nestjs/common', () => {
  const original =
    jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...original,
    SetMetadata: jest.fn(original.SetMetadata),
  };
});

describe('Roles 데코레이터', () => {
  it('ROLES_KEY 상수를 export해야 한다', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('ROLES_KEY와 제공된 역할로 SetMetadata를 호출해야 한다', () => {
    Roles(Role.STUDENT, Role.TUTOR);
    expect(SetMetadata).toHaveBeenCalledWith('roles', [
      Role.STUDENT,
      Role.TUTOR,
    ]);
  });
});
