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

describe('Roles Decorator', () => {
  it('should export ROLES_KEY constant', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('should call SetMetadata with ROLES_KEY and provided roles', () => {
    Roles(Role.ADMIN, Role.TUTOR);
    expect(SetMetadata).toHaveBeenCalledWith('roles', [Role.ADMIN, Role.TUTOR]);
  });
});
