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

describe('Public Decorator', () => {
  it('should export IS_PUBLIC_KEY constant', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should call SetMetadata with IS_PUBLIC_KEY and true', () => {
    Public();
    expect(SetMetadata).toHaveBeenCalledWith('isPublic', true);
  });
});
