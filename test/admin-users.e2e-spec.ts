import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { ERROR_MESSAGES } from '../src/common/constants/error-messages.constant';
import { Role } from '../src/common/enums';
import {
  createTestApp,
  teardownTestApp,
  TestContext,
} from './helpers/create-app';
import {
  createAdminAndLogin,
  createStudentAndLogin,
} from './helpers/admin-helpers';
import {
  expectErrorEnvelope,
  expectSuccessEnvelope,
} from './helpers/assert-response';
import { PaginatedData } from './helpers/test-interfaces';
import {
  assertAdminAuditLogExists,
  assertRefreshTokenStateByEmail,
  assertUserActiveStateByEmail,
  assertUserRoleByEmail,
} from './helpers/db-assertions';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

describe('Admin Users (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;

    const admin = await createAdminAndLogin(app, dataSource, {
      label: 'Admin Users Root',
    });
    adminToken = admin.accessToken;
    adminUserId = admin.userId;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it('관리자는 사용자 목록을 role 필터로 조회할 수 있다', async () => {
    const student = await createStudentAndLogin(app, {
      label: 'Admin Users Student',
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ role: 'student', search: student.email })
      .expect(200);

    const body = expectSuccessEnvelope<PaginatedData<UserData>>(res, 200);
    expect(body.data.data.some((user) => user.email === student.email)).toBe(
      true,
    );
  });

  it('관리자는 사용자를 비활성화하고 세션을 무효화할 수 있다', async () => {
    const student = await createStudentAndLogin(app, {
      label: 'Deactivate Student',
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${student.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false, reason: 'policy' })
      .expect(200);

    await assertUserActiveStateByEmail(dataSource, student.email, false);
    await assertRefreshTokenStateByEmail(dataSource, student.email, false);
    await assertAdminAuditLogExists(
      dataSource,
      'users.update_status',
      'user',
      student.userId,
    );

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${student.refreshToken}`)
      .expect(401);

    expectErrorEnvelope(refreshRes, 401);
  });

  it('관리자는 사용자 역할을 tutor로 변경할 수 있다', async () => {
    const student = await createStudentAndLogin(app, {
      label: 'Promote Student',
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${student.userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'tutor', reason: 'promotion' })
      .expect(200);

    await assertUserRoleByEmail(dataSource, student.email, Role.TUTOR);
    await assertAdminAuditLogExists(
      dataSource,
      'users.update_role',
      'user',
      student.userId,
    );
  });

  it('관리자는 사용자 세션을 강제로 해제할 수 있다', async () => {
    const student = await createStudentAndLogin(app, {
      label: 'Revoke Session Student',
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/users/${student.userId}/sessions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await assertRefreshTokenStateByEmail(dataSource, student.email, false);
    await assertAdminAuditLogExists(
      dataSource,
      'users.revoke_sessions',
      'user',
      student.userId,
    );
  });

  it('관리자는 자기 자신을 비활성화할 수 없다', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${adminUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(400);

    expectErrorEnvelope(res, 400, ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF);
  });

  it('관리자는 자기 자신의 역할을 변경할 수 없다', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${adminUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: Role.TUTOR })
      .expect(400);

    expectErrorEnvelope(res, 400, ERROR_MESSAGES.CANNOT_CHANGE_OWN_ROLE);
  });

  it('관리자가 아닌 사용자는 admin users API에 접근할 수 없다', async () => {
    const student = await createStudentAndLogin(app, {
      label: 'Forbidden Student',
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(403);

    expectErrorEnvelope(res, 403);
  });
});
