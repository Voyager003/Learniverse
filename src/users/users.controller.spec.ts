import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Role } from '../common/enums/index.js';

const mockUser: User = {
  id: 'uuid-1',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  name: 'Test User',
  role: Role.STUDENT,
  isActive: true,
  refreshToken: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  const mockReqUser = {
    user: { userId: 'uuid-1', email: 'test@example.com', role: Role.STUDENT },
  };

  describe('GET /users', () => {
    it('should return an array of UserResponseDto', async () => {
      const users = [mockUser, { ...mockUser, id: 'uuid-2', name: 'User 2' }];
      usersService.findAll!.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(UserResponseDto);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /users/me', () => {
    it('should return current user profile as UserResponseDto', async () => {
      usersService.findById!.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockReqUser);

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.id).toBe('uuid-1');
      expect(result).not.toHaveProperty('passwordHash');
      expect(usersService.findById).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id as UserResponseDto', async () => {
      usersService.findById!.mockResolvedValue(mockUser);

      const result = await controller.findOne('uuid-1');

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.id).toBe('uuid-1');
      expect(usersService.findById).toHaveBeenCalledWith('uuid-1');
    });

    it('should propagate NotFoundException from service', async () => {
      usersService.findById!.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /users/me', () => {
    it('should update current user and return UserResponseDto', async () => {
      const dto: UpdateUserDto = { name: 'Updated Name' };
      const updated = { ...mockUser, name: 'Updated Name' };
      usersService.update!.mockResolvedValue(updated);

      const result = await controller.updateMe(mockReqUser, dto);

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.name).toBe('Updated Name');
      expect(usersService.update).toHaveBeenCalledWith('uuid-1', dto);
    });
  });
});
