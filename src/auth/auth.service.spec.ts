import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../common/enums/index.js';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockedHash = bcrypt.hash as jest.Mock;
const mockedCompare = bcrypt.compare as jest.Mock;

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

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let configService: Partial<Record<keyof ConfigService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateRefreshToken: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    mockedHash.mockReset();
    mockedCompare.mockReset();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      usersService.findByEmail!.mockResolvedValue(null);
      mockedHash.mockResolvedValue('hashed-pw');
      usersService.create!.mockResolvedValue({ ...mockUser, id: 'new-uuid' });
      jwtService.signAsync!.mockResolvedValueOnce('access-token');
      jwtService.signAsync!.mockResolvedValueOnce('refresh-token');
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      jwtService.signAsync!.mockResolvedValueOnce('access-token');
      jwtService.signAsync!.mockResolvedValueOnce('refresh-token');
      mockedHash.mockResolvedValue('hashed-refresh');
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      usersService.findByEmail!.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'wrong@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const userWithToken = {
        ...mockUser,
        refreshToken: 'hashed-old-refresh',
      };
      usersService.findById!.mockResolvedValue(userWithToken);
      mockedCompare.mockResolvedValue(true);
      jwtService.signAsync!.mockResolvedValueOnce('new-access-token');
      jwtService.signAsync!.mockResolvedValueOnce('new-refresh-token');
      mockedHash.mockResolvedValue('hashed-new-refresh');
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      const result = await authService.refresh('uuid-1', 'old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(usersService.findById).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw UnauthorizedException if user has no refresh token', async () => {
      usersService.findById!.mockResolvedValue(mockUser);

      await expect(authService.refresh('uuid-1', 'some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const userWithToken = {
        ...mockUser,
        refreshToken: 'hashed-old-refresh',
      };
      usersService.findById!.mockResolvedValue(userWithToken);
      mockedCompare.mockResolvedValue(false);

      await expect(
        authService.refresh('uuid-1', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should set refresh token to null', async () => {
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      await authService.logout('uuid-1');

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'uuid-1',
        null,
      );
    });
  });
});
