import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Partial<Record<keyof Reflector, jest.Mock>>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  const createMockContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn().mockReturnValue([{}, {}, undefined, undefined]),
    }) as unknown as ExecutionContext;

  it('should allow access when route is marked as public', () => {
    reflector.getAllAndOverride!.mockReturnValue(true);
    const context = createMockContext();

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should call super.canActivate when route is not public', () => {
    reflector.getAllAndOverride!.mockReturnValue(false);
    const context = createMockContext();

    // Spy on parent's canActivate to verify delegation
    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);

    superCanActivate.mockRestore();
  });

  it('should call super.canActivate when IS_PUBLIC_KEY is undefined', () => {
    reflector.getAllAndOverride!.mockReturnValue(undefined);
    const context = createMockContext();

    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);

    superCanActivate.mockRestore();
  });
});
