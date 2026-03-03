import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  teardownTestApp,
  TestContext,
} from './helpers/create-app';
import { AuthTokens } from './helpers/test-interfaces';
import {
  expectErrorEnvelope,
  expectSuccessEnvelope,
} from './helpers/assert-response';
import { Role } from '../src/common/enums';
import {
  assertUserNameByEmail,
  assertUserRoleByEmail,
} from './helpers/db-assertions';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;
  let accessToken: string;
  const email = 'users-e2e@test.com';

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;

    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email,
      password: 'password123',
      name: 'Users E2E',
      role: 'student',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    const loginBody = expectSuccessEnvelope<AuthTokens>(loginRes, 200);
    accessToken = loginBody.data.accessToken;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  describe('GET /api/v1/users/me', () => {
    it('인증된 사용자는 자신의 정보를 조회할 수 있다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = expectSuccessEnvelope<UserData>(res, 200);
      expect(body.data.email).toBe(email);
      expect(body.data.name).toBe('Users E2E');
      expect(body.data.role).toBe(Role.STUDENT);

      await assertUserRoleByEmail(dataSource, email, Role.STUDENT);
    });

    it('인증이 없으면 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      const body = expectErrorEnvelope(res, 401);
      expect(body.message).toBeDefined();
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('사용자 이름을 수정하고 DB에 반영한다', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Users E2E Updated' })
        .expect(200);

      const body = expectSuccessEnvelope<UserData>(res, 200);
      expect(body.data.name).toBe('Users E2E Updated');

      await assertUserNameByEmail(dataSource, email, 'Users E2E Updated');
    });

    it('빈 문자열 name은 400을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' })
        .expect(400);

      expectErrorEnvelope(res, 400);
    });

    it('인증이 없으면 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ name: 'No Auth' })
        .expect(401);

      expectErrorEnvelope(res, 401);
    });
  });
});
