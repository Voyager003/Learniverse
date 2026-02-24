import { User } from './user.entity.js';
import { Role } from '../../common/enums/index.js';

describe('User 엔티티', () => {
  it('기본값으로 사용자를 생성해야 한다', () => {
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

  it('역할을 TUTOR로 설정할 수 있어야 한다', () => {
    const user = new User();
    user.role = Role.TUTOR;

    expect(user.role).toBe(Role.TUTOR);
  });

  it('역할을 ADMIN으로 설정할 수 있어야 한다', () => {
    const user = new User();
    user.role = Role.ADMIN;

    expect(user.role).toBe(Role.ADMIN);
  });

  it('refreshToken을 설정할 수 있어야 한다', () => {
    const user = new User();
    user.refreshToken = 'some-hashed-token';

    expect(user.refreshToken).toBe('some-hashed-token');
  });

  it('사용자를 비활성화할 수 있어야 한다', () => {
    const user = new User();
    user.isActive = false;

    expect(user.isActive).toBe(false);
  });
});
