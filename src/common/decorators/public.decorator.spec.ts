import { SetMetadata } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from './public.decorator.js';

// SetMetadata mock to verify decorator behavior
jest.mock('@nestjs/common', () => {
  const original =
    jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...original,
    SetMetadata: jest.fn(original.SetMetadata),
  };
});

describe('Public 데코레이터', () => {
  it('IS_PUBLIC_KEY 상수를 export해야 한다', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('IS_PUBLIC_KEY와 true로 SetMetadata를 호출해야 한다', () => {
    Public();
    expect(SetMetadata).toHaveBeenCalledWith('isPublic', true);
  });
});
