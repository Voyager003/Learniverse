import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthResponseDto } from '../../auth/dto/auth-response.dto.js';
import { LoginDto } from '../../auth/dto/login.dto.js';
import { AuthService } from '../../auth/auth.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AdminRegisterDto } from './dto/admin-register.dto.js';
import { AdminRegisterResponseDto } from './dto/admin-register-response.dto.js';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '관리자 회원가입' })
  @ApiResponse({
    status: 201,
    description: '관리자 회원가입 성공',
    type: AdminRegisterResponseDto,
  })
  @ApiResponse({ status: 409, description: '이메일 중복' })
  register(@Body() dto: AdminRegisterDto): Promise<AdminRegisterResponseDto> {
    return this.authService.registerAdmin(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '관리자 로그인' })
  @ApiResponse({
    status: 200,
    description: '관리자 로그인 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.loginAdmin(dto);
  }
}
