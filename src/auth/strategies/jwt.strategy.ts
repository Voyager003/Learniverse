import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service.js';
import { User } from '../../users/entities/user.entity.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { RequestUser } from '../interfaces/request-user.interface.js';
import { ERROR_MESSAGES } from '../../common/constants/error-messages.constant.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    let user: User;
    try {
      user = await this.usersService.findById(payload.sub);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
      }
      throw error;
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
