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
import { assertAdminAuditLogExists } from './helpers/db-assertions';

interface AdminAuditLogData {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
}

describe('Admin Auth (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it('공개 관리자 회원가입 후 관리자 로그인할 수 있다', async () => {
    const email = `public-admin-${Date.now()}@test.com`;

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/register')
      .send({
        email,
        password: 'password123',
        name: 'Public Admin',
      })
      .expect(201);

    const registerBody = expectSuccessEnvelope<{
      email: string;
      role: Role.ADMIN;
    }>(registerRes, 201);
    expect(registerBody.data).toEqual({
      email,
      role: Role.ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    const loginBody = expectSuccessEnvelope<{
      accessToken: string;
      refreshToken: string;
    }>(loginRes, 200);
    expect(loginBody.data.accessToken).toBeDefined();
    expect(loginBody.data.refreshToken).toBeDefined();
  });

  it('관리자가 아닌 사용자는 관리자 로그인에 실패한다', async () => {
    const student = await createStudentAndLogin(app, {
      label: 'Admin Login Student',
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email: student.email, password: student.password })
      .expect(401);

    expectErrorEnvelope(res, 401, ERROR_MESSAGES.UNAUTHORIZED);
  });

  it('관리자는 관리자 로그인 후 감사 로그를 조회할 수 있다', async () => {
    const admin = await createAdminAndLogin(app, dataSource, {
      label: 'Admin Login Success',
    });

    const logsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .query({ action: 'admin.login' })
      .expect(200);

    const body = expectSuccessEnvelope<PaginatedData<AdminAuditLogData>>(
      logsRes,
      200,
    );
    expect(body.data.data.some((log) => log.action === 'admin.login')).toBe(
      true,
    );
    await assertAdminAuditLogExists(
      dataSource,
      'admin.login',
      'auth',
      admin.userId,
    );
  });

  it('비활성 관리자 계정은 관리자 로그인에 실패한다', async () => {
    const admin = await createStudentAndLogin(app, { label: 'Inactive Admin' });
    await dataSource.query(
      'UPDATE users SET role = $1, is_active = false WHERE email = $2',
      ['admin', admin.email],
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(401);

    expectErrorEnvelope(res, 401, ERROR_MESSAGES.UNAUTHORIZED);
  });

  it('일반 공개 회원가입으로 admin role을 만들 수 없다', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `admin-register-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Invalid Admin',
        role: 'admin',
      })
      .expect(400);

    expectErrorEnvelope(res, 400);
  });
});
