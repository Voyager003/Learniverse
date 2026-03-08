import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../auth/auth.service.js';
import { AuthResponseDto } from '../../auth/dto/auth-response.dto.js';
import { LoginDto } from '../../auth/dto/login.dto.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminRegisterDto } from './dto/admin-register.dto.js';
import { AdminRegisterResponseDto } from './dto/admin-register-response.dto.js';

const mockTokens: AuthResponseDto = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const mockAdminRegisterResponse: AdminRegisterResponseDto = {
  email: 'admin@example.com',
  role: 'admin',
};

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;

  beforeEach(async () => {
    authService = {
      registerAdmin: jest.fn(),
      loginAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
  });

  it('관리자 회원가입에 성공하면 관리자 응답을 반환해야 한다', async () => {
    const dto: AdminRegisterDto = {
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
    };
    authService.registerAdmin!.mockResolvedValue(mockAdminRegisterResponse);

    const result = await controller.register(dto);

    expect(result).toEqual(mockAdminRegisterResponse);
    expect(authService.registerAdmin).toHaveBeenCalledWith(dto);
  });

  it('관리자 로그인에 성공하면 토큰을 반환해야 한다', async () => {
    const dto: LoginDto = {
      email: 'admin@example.com',
      password: 'password123',
    };
    authService.loginAdmin!.mockResolvedValue(mockTokens);

    const result = await controller.login(dto);

    expect(result).toEqual(mockTokens);
    expect(authService.loginAdmin).toHaveBeenCalledWith(dto);
  });
});
