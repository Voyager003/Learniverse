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
    it('should create a UserResponseDto from a User entity', () => {
      const dto = UserResponseDto.from(mockUser);

      expect(dto.id).toBe('uuid-1');
      expect(dto.email).toBe('test@example.com');
      expect(dto.name).toBe('Test User');
      expect(dto.role).toBe(Role.STUDENT);
      expect(dto.isActive).toBe(true);
      expect(dto.createdAt).toEqual(new Date('2025-01-01'));
    });

    it('should NOT expose passwordHash', () => {
      const dto = UserResponseDto.from(mockUser);

      expect(dto).not.toHaveProperty('passwordHash');
    });

    it('should NOT expose refreshToken', () => {
      const dto = UserResponseDto.from(mockUser);

      expect(dto).not.toHaveProperty('refreshToken');
    });
  });

  describe('fromMany', () => {
    it('should convert an array of User entities', () => {
      const users = [mockUser, { ...mockUser, id: 'uuid-2', name: 'User 2' }];
      const dtos = UserResponseDto.fromMany(users);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('uuid-1');
      expect(dtos[1].id).toBe('uuid-2');
    });
  });
});
