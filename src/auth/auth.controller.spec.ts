import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { Role } from '../common/enums/index.js';

const mockTokens: AuthResponseDto = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const dto: RegisterDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };
      authService.register!.mockResolvedValue(mockTokens);

      const result = await controller.register(dto);

      expect(result).toEqual(mockTokens);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return tokens', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      authService.login!.mockResolvedValue(mockTokens);

      const result = await controller.login(dto);

      expect(result).toEqual(mockTokens);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens using the refresh token from header', async () => {
      authService.refresh!.mockResolvedValue(mockTokens);
      const req = {
        user: {
          userId: 'uuid-1',
          email: 'test@example.com',
          role: Role.STUDENT,
        },
        get: jest.fn().mockReturnValue('Bearer old-refresh-token'),
      };

      const result = await controller.refresh(req);

      expect(result).toEqual(mockTokens);
      expect(authService.refresh).toHaveBeenCalledWith(
        'uuid-1',
        'old-refresh-token',
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user by clearing refresh token', async () => {
      authService.logout!.mockResolvedValue(undefined);
      const req = {
        user: {
          userId: 'uuid-1',
          email: 'test@example.com',
          role: Role.STUDENT,
        },
      };

      await controller.logout(req);

      expect(authService.logout).toHaveBeenCalledWith('uuid-1');
    });
  });
});
