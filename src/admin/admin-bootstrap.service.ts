import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { Role } from '../common/enums/index.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';

const SALT_ROUNDS = 10;

interface EnsureAdminUserInput {
  email: string;
  password: string;
  name: string;
}

interface EnsureAdminUserResult {
  user: User;
  created: boolean;
}

@Injectable()
export class AdminBootstrapService {
  constructor(private readonly usersService: UsersService) {}

  async ensureAdminUser(
    input: EnsureAdminUserInput,
  ): Promise<EnsureAdminUserResult> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      if (existing.role !== Role.ADMIN) {
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      }

      return { user: existing, created: false };
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: Role.ADMIN,
    });

    return { user, created: true };
  }
}
