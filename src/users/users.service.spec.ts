import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { Role } from '../common/enums/index.js';

type MockRepository = Partial<Record<keyof Repository<User>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: MockRepository;

  beforeEach(async () => {
    repository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail', () => {
    it('should return a user if found', async () => {
      const user = { id: 'uuid-1', email: 'test@example.com' } as User;
      repository.findOne!.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user if found', async () => {
      const user = { id: 'uuid-1', email: 'test@example.com' } as User;
      repository.findOne!.mockResolvedValue(user);

      const result = await service.findById('uuid-1');

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const createData = {
        email: 'new@example.com',
        passwordHash: 'hashed',
        name: 'New User',
      };
      const user = {
        id: 'uuid-new',
        ...createData,
        role: Role.STUDENT,
      } as User;

      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue(user);
      repository.save!.mockResolvedValue(user);

      const result = await service.create(createData);

      expect(result).toEqual(user);
      expect(repository.create).toHaveBeenCalledWith(createData);
      expect(repository.save).toHaveBeenCalledWith(user);
    });

    it('should throw ConflictException if email already exists', async () => {
      const existing = { id: 'uuid-1', email: 'exists@example.com' } as User;
      repository.findOne!.mockResolvedValue(existing);

      await expect(
        service.create({
          email: 'exists@example.com',
          passwordHash: 'hashed',
          name: 'Duplicate',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const user = {
        id: 'uuid-1',
        email: 'test@example.com',
        name: 'Old Name',
      } as User;
      const updated = { ...user, name: 'New Name' } as User;

      repository.findOne!.mockResolvedValue(user);
      repository.save!.mockResolvedValue(updated);

      const result = await service.update('uuid-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        { id: 'uuid-1', email: 'a@example.com' },
        { id: 'uuid-2', email: 'b@example.com' },
      ] as User[];
      repository.find!.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('updateRefreshToken', () => {
    it('should update refresh token', async () => {
      const user = { id: 'uuid-1', refreshToken: null } as User;
      const updated = { ...user, refreshToken: 'new-token' } as User;

      repository.findOne!.mockResolvedValue(user);
      repository.save!.mockResolvedValue(updated);

      const result = await service.updateRefreshToken('uuid-1', 'new-token');

      expect(result.refreshToken).toBe('new-token');
    });

    it('should set refresh token to null on logout', async () => {
      const user = { id: 'uuid-1', refreshToken: 'old-token' } as User;
      const updated = { ...user, refreshToken: null } as User;

      repository.findOne!.mockResolvedValue(user);
      repository.save!.mockResolvedValue(updated);

      const result = await service.updateRefreshToken('uuid-1', null);

      expect(result.refreshToken).toBeNull();
    });
  });
});
