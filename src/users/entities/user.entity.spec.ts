import { User } from './user.entity.js';
import { Role } from '../../common/enums/index.js';

describe('User Entity', () => {
  it('should create a user with default values', () => {
    const user = new User();
    user.email = 'test@example.com';
    user.passwordHash = 'hashed';
    user.name = 'Test User';

    expect(user.email).toBe('test@example.com');
    expect(user.passwordHash).toBe('hashed');
    expect(user.name).toBe('Test User');
    expect(user.role).toBe(Role.STUDENT);
    expect(user.isActive).toBe(true);
    expect(user.refreshToken).toBeNull();
  });

  it('should allow setting role to TUTOR', () => {
    const user = new User();
    user.role = Role.TUTOR;

    expect(user.role).toBe(Role.TUTOR);
  });

  it('should allow setting role to ADMIN', () => {
    const user = new User();
    user.role = Role.ADMIN;

    expect(user.role).toBe(Role.ADMIN);
  });

  it('should allow setting refreshToken', () => {
    const user = new User();
    user.refreshToken = 'some-hashed-token';

    expect(user.refreshToken).toBe('some-hashed-token');
  });

  it('should allow deactivating user', () => {
    const user = new User();
    user.isActive = false;

    expect(user.isActive).toBe(false);
  });
});
