import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard.js';
import { RequestUser } from './interfaces/request-user.interface.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '가입 성공', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: '이메일 중복' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '갱신 성공', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: '유효하지 않은 리프레시 토큰' })
  refresh(
    @Req()
    req: {
      user: RequestUser;
      get: (name: string) => string | undefined;
    },
  ): Promise<AuthResponseDto> {
    const { userId } = req.user;
    const authHeader = req.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
    const rawToken = authHeader.slice(7);
    return this.authService.refresh(userId, rawToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 204, description: '로그아웃 성공' })
  @ApiResponse({ status: 401, description: '미인증' })
  logout(@Req() req: { user: RequestUser }): Promise<void> {
    return this.authService.logout(req.user.userId);
  }
}
