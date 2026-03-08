import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../auth/auth.service.js';
import { AuthResponseDto } from '../../auth/dto/auth-response.dto.js';
import { LoginDto } from '../../auth/dto/login.dto.js';
import { AdminAuthController } from './admin-auth.controller.js';

const mockTokens: AuthResponseDto = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;

  beforeEach(async () => {
    authService = {
      loginAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
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
