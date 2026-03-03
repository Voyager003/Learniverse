import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { Role } from '../common/enums/index.js';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: Role;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    return this.saveUserSafely(this.usersRepository.create(data));
  }

  async update(id: string, data: Partial<Pick<User, 'name'>>): Promise<User> {
    return this.updateUser(id, (user) => {
      Object.assign(user, data);
    });
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<User> {
    return this.updateUser(id, (user) => {
      user.refreshToken = refreshToken;
    });
  }

  private async updateUser(
    id: string,
    mutate: (user: User) => void,
  ): Promise<User> {
    const user = await this.findById(id);
    mutate(user);
    return this.saveUserSafely(user);
  }

  private async saveUserSafely(user: User): Promise<User> {
    try {
      return await this.usersRepository.save(user);
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as Record<string, unknown>)['code'] ===
          UNIQUE_VIOLATION_CODE
      ) {
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }
  }
}
