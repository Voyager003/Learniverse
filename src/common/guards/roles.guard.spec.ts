import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { Role } from '../enums/index.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Partial<Record<keyof Reflector, jest.Mock>>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  const createMockContext = (userRole: Role): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'uuid-1', email: 'test@example.com', role: userRole },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('필요한 역할이 없으면 접근을 허용해야 한다', () => {
    reflector.getAllAndOverride!.mockReturnValue(undefined);
    const context = createMockContext(Role.STUDENT);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('사용자가 필요한 역할을 가지고 있으면 접근을 허용해야 한다', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.TUTOR]);
    const context = createMockContext(Role.TUTOR);

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('여러 필요 역할 중 하나를 가지고 있으면 접근을 허용해야 한다', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.STUDENT, Role.TUTOR]);
    const context = createMockContext(Role.TUTOR);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('필요한 역할이 없으면 ForbiddenException을 던져야 한다', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.TUTOR]);
    const context = createMockContext(Role.STUDENT);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Insufficient permissions',
    );
  });

  it('역할이 필요하지만 요청에 사용자가 없으면 ForbiddenException을 던져야 한다', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.TUTOR]);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Insufficient permissions',
    );
  });
});
