import { UserResponseDto } from './user-response.dto.js';
import { User } from '../entities/user.entity.js';
import { Role } from '../../common/enums/index.js';

describe('UserResponseDto', () => {
  const mockUser: User = {
    id: 'uuid-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    name: 'Test User',
    role: Role.STUDENT,
    isActive: true,
    refreshToken: 'hashed-refresh-token',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  describe('from', () => {
    it('User 엔티티로부터 UserResponseDto를 생성해야 한다', () => {
      const dto = UserResponseDto.from(mockUser);

      expect(dto.id).toBe('uuid-1');
      expect(dto.email).toBe('test@example.com');
      expect(dto.name).toBe('Test User');
      expect(dto.role).toBe(Role.STUDENT);
      expect(dto.isActive).toBe(true);
      expect(dto.createdAt).toEqual(new Date('2025-01-01'));
      expect(dto.updatedAt).toEqual(new Date('2025-01-02'));
    });

    it('passwordHash를 노출하지 않아야 한다', () => {
      const dto = UserResponseDto.from(mockUser);

      expect(dto).not.toHaveProperty('passwordHash');
    });

    it('refreshToken을 노출하지 않아야 한다', () => {
      const dto = UserResponseDto.from(mockUser);

      expect(dto).not.toHaveProperty('refreshToken');
    });
  });

  describe('fromMany', () => {
    it('User 엔티티 배열을 변환해야 한다', () => {
      const users = [mockUser, { ...mockUser, id: 'uuid-2', name: 'User 2' }];
      const dtos = UserResponseDto.fromMany(users);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('uuid-1');
      expect(dtos[1].id).toBe('uuid-2');
    });
  });
});
