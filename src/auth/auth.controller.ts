import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard.js';
import { RequestUser } from './interfaces/request-user.interface.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Req()
    req: {
      user: RequestUser;
      get: (name: string) => string | undefined;
    },
  ): Promise<AuthResponseDto> {
    const { userId } = req.user;
    const rawToken = req.get('Authorization')?.replace('Bearer ', '') ?? '';
    return this.authService.refresh(userId, rawToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Req() req: { user: RequestUser }): Promise<void> {
    return this.authService.logout(req.user.userId);
  }
}
