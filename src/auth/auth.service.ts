import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { Role } from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { AdminAuditService } from '../admin/admin-audit.service.js';
import { AdminRegisterDto } from '../admin/auth/dto/admin-register.dto.js';
import { AdminRegisterResponseDto } from '../admin/auth/dto/admin-register-response.dto.js';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role ?? Role.STUDENT,
    });

    return this.generateAndPersistTokens(user.id, user.email, user.role);
  }

  async registerAdmin(
    dto: AdminRegisterDto,
  ): Promise<AdminRegisterResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: Role.ADMIN,
    });

    return {
      email: user.email,
      role: Role.ADMIN,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(dto);
    return this.generateAndPersistTokens(user.id, user.email, user.role);
  }

  async loginAdmin(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(dto);
    if (user.role !== Role.ADMIN || !user.isActive) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const tokens = await this.generateAndPersistTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.adminAuditService.record({
      actorId: user.id,
      action: 'admin.login',
      resourceType: 'auth',
      resourceId: user.id,
      afterState: { role: Role.ADMIN },
      metadata: { email: user.email },
    });
    return tokens;
  }

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);

    if (!user.isActive) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!user.refreshToken) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    return this.generateAndPersistTokens(user.id, user.email, user.role);
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async validateCredentials(dto: LoginDto): Promise<User> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return user;
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<StringValue>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<StringValue>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    await this.usersService.updateRefreshToken(userId, hashedToken);
  }

  private async generateAndPersistTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(userId, email, role);
    await this.storeRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }
}
