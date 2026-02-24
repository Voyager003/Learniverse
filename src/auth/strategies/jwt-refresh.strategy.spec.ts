import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtRefreshStrategy } from './jwt-refresh.strategy.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { Role } from '../../common/enums/index.js';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  beforeEach(async () => {
    const configService: Partial<Record<keyof ConfigService, jest.Mock>> = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'jwt.refreshSecret': 'test-refresh-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'uuid-1',
      email: 'test@example.com',
      role: Role.STUDENT,
    };

    it('should return userId and email for a valid payload', () => {
      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'uuid-1',
        email: 'test@example.com',
        role: Role.STUDENT,
      });
    });

    it('should throw UnauthorizedException if sub is missing', () => {
      const invalidPayload = {
        email: 'test@example.com',
        role: Role.STUDENT,
      } as JwtPayload;

      expect(() => strategy.validate(invalidPayload)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
