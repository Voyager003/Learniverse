import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { Role } from '../common/enums/index.js';

type MockRepository = Partial<Record<keyof Repository<User>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
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
    it('사용자를 찾으면 반환해야 한다', async () => {
      const user = { id: 'uuid-1', email: 'test@example.com' } as User;
      repository.findOne!.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('사용자를 찾지 못하면 null을 반환해야 한다', async () => {
      repository.findOne!.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('사용자를 찾으면 반환해야 한다', async () => {
      const user = { id: 'uuid-1', email: 'test@example.com' } as User;
      repository.findOne!.mockResolvedValue(user);

      const result = await service.findById('uuid-1');

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('사용자를 찾지 못하면 NotFoundException을 던져야 한다', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('새 사용자를 생성하고 반환해야 한다', async () => {
      const createData = {
        email: 'new@example.com',
        passwordHash: 'hashed',
        name: 'New User',
        role: Role.STUDENT,
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

    it('이메일이 이미 존재하면 ConflictException을 던져야 한다', async () => {
      const existing = { id: 'uuid-1', email: 'exists@example.com' } as User;
      repository.findOne!.mockResolvedValue(existing);

      await expect(
        service.create({
          email: 'exists@example.com',
          passwordHash: 'hashed',
          name: 'Duplicate',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('유니크 제약 위반 시 ConflictException을 던져야 한다 (경쟁 조건)', async () => {
      repository.findOne!.mockResolvedValue(null);
      const user = { id: 'uuid-new', email: 'race@example.com' } as User;
      repository.create!.mockReturnValue(user);

      const driverError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      const queryError = new QueryFailedError(
        'INSERT INTO users',
        [],
        driverError,
      );
      repository.save!.mockRejectedValue(queryError);

      await expect(
        service.create({
          email: 'race@example.com',
          passwordHash: 'hashed',
          name: 'Race User',
          role: Role.TUTOR,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('사용자를 업데이트하고 반환해야 한다', async () => {
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

    it('사용자가 존재하지 않으면 NotFoundException을 던져야 한다', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRefreshToken', () => {
    it('리프레시 토큰을 업데이트해야 한다', async () => {
      const user = { id: 'uuid-1', refreshToken: null } as User;
      const updated = { ...user, refreshToken: 'new-token' } as User;

      repository.findOne!.mockResolvedValue(user);
      repository.save!.mockResolvedValue(updated);

      const result = await service.updateRefreshToken('uuid-1', 'new-token');

      expect(result.refreshToken).toBe('new-token');
    });

    it('로그아웃 시 리프레시 토큰을 null로 설정해야 한다', async () => {
      const user = { id: 'uuid-1', refreshToken: 'old-token' } as User;
      const updated = { ...user, refreshToken: null } as User;

      repository.findOne!.mockResolvedValue(user);
      repository.save!.mockResolvedValue(updated);

      const result = await service.updateRefreshToken('uuid-1', null);

      expect(result.refreshToken).toBeNull();
    });
  });
});
