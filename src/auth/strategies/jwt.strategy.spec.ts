import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';
import { UsersService } from '../../users/users.service.js';
import { User } from '../../users/entities/user.entity.js';
import { Role } from '../../common/enums/index.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

const mockUser: User = {
  id: 'uuid-1',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  name: 'Test User',
  role: Role.STUDENT,
  isActive: true,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
    };

    const configService: Partial<Record<keyof ConfigService, jest.Mock>> = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-jwt-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'uuid-1',
      email: 'test@example.com',
      role: Role.STUDENT,
    };

    it('유효한 페이로드에 대해 사용자 데이터를 반환해야 한다', async () => {
      usersService.findById!.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'uuid-1',
        email: 'test@example.com',
        role: Role.STUDENT,
      });
      expect(usersService.findById).toHaveBeenCalledWith('uuid-1');
    });

    it('사용자를 찾을 수 없으면 UnauthorizedException을 던져야 한다 (NotFoundException 변환)', async () => {
      usersService.findById!.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('비활성 사용자이면 UnauthorizedException을 던져야 한다', async () => {
      usersService.findById!.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
