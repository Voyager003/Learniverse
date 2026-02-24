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

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride!.mockReturnValue(undefined);
    const context = createMockContext(Role.STUDENT);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should allow access when user has one of multiple required roles', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.ADMIN, Role.TUTOR]);
    const context = createMockContext(Role.TUTOR);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException with message when user lacks the required role', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.STUDENT);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
  });

  it('should throw ForbiddenException when roles required but no user in request', () => {
    reflector.getAllAndOverride!.mockReturnValue([Role.ADMIN]);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
  });
});
