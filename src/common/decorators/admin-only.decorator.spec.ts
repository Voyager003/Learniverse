import { SetMetadata } from '@nestjs/common';
import { AdminOnly } from './admin-only.decorator.js';
import { Role } from '../enums/index.js';

jest.mock('@nestjs/common', () => {
  const original =
    jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...original,
    SetMetadata: jest.fn(original.SetMetadata),
  };
});

describe('AdminOnly 데코레이터', () => {
  it('admin role 메타데이터를 설정해야 한다', () => {
    AdminOnly();

    expect(SetMetadata).toHaveBeenCalledWith('roles', [Role.ADMIN]);
  });
});
