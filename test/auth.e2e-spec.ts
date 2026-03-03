import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ERROR_MESSAGES } from '../src/common/constants/error-messages.constant';
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
import {
  assertRefreshTokenStateByEmail,
  assertUserRoleByEmail,
} from './helpers/db-assertions';
import { Role } from '../src/common/enums';

describe('Auth (e2e)', () => {
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

  // --- Register ---

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'student',
    };

    it('회원가입 성공 시 201과 토큰 쌍을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      const body = expectSuccessEnvelope<AuthTokens>(res, 201);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      expect(typeof body.data.accessToken).toBe('string');
      expect(typeof body.data.refreshToken).toBe('string');

      await assertUserRoleByEmail(dataSource, validUser.email, Role.STUDENT);
    });

    it('중복 이메일로 가입 시 409를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(409);

      const body = expectErrorEnvelope(
        res,
        409,
        ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
      );
      expect(body.message).toBe(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    });

    it('잘못된 이메일 형식이면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'password123', name: 'User' })
        .expect(400);
    });

    it('비밀번호가 6자 미만이면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'short@example.com', password: '12345', name: 'User' })
        .expect(400);
    });

    it('필수 필드 누락 시 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'missing@example.com' })
        .expect(400);
    });

    it('튜터 role로 회원가입할 수 있다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'tutor@example.com',
          password: 'password123',
          name: 'Tutor User',
          role: 'tutor',
        })
        .expect(201);

      const body = expectSuccessEnvelope<AuthTokens>(res, 201);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');

      await assertUserRoleByEmail(dataSource, 'tutor@example.com', Role.TUTOR);
    });

    it('허용되지 않은 role이면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'invalid-role@example.com',
          role: 'admin',
        })
        .expect(400);
    });
  });

  // --- Login ---

  describe('POST /api/v1/auth/login', () => {
    it('올바른 자격증명으로 로그인 시 200과 토큰 쌍을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      const body = expectSuccessEnvelope<AuthTokens>(res, 200);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');

      await assertRefreshTokenStateByEmail(
        dataSource,
        'test@example.com',
        true,
      );
    });

    it('잘못된 비밀번호로 로그인 시 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' })
        .expect(401);

      const body = expectErrorEnvelope(
        res,
        401,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
      expect(body.message).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });

    it('존재하지 않는 이메일로 로그인 시 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);

      const body = expectErrorEnvelope(
        res,
        401,
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
      expect(body.message).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });
  });

  // --- Refresh ---

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const body = expectSuccessEnvelope<AuthTokens>(res, 200);
      refreshToken = body.data.refreshToken;
    });

    it('유효한 리프레시 토큰으로 갱신 시 200과 새 토큰 쌍을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      const body = expectSuccessEnvelope<AuthTokens>(res, 200);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      // Save new refresh token for subsequent tests
      refreshToken = body.data.refreshToken;

      await assertRefreshTokenStateByEmail(
        dataSource,
        'test@example.com',
        true,
      );
    });

    it('Authorization 헤더 없이 갱신 시 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);

      expectErrorEnvelope(res, 401);
    });

    it('잘못된 리프레시 토큰으로 갱신 시 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expectErrorEnvelope(res, 401);
    });
  });

  // --- Logout ---

  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const body = expectSuccessEnvelope<AuthTokens>(res, 200);
      accessToken = body.data.accessToken;
      refreshToken = body.data.refreshToken;
    });

    it('인증된 사용자가 로그아웃 시 204를 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await assertRefreshTokenStateByEmail(
        dataSource,
        'test@example.com',
        false,
      );
    });

    it('로그아웃 후 리프레시 토큰이 무효화된다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });

    it('인증 없이 로그아웃 시 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);

      expectErrorEnvelope(res, 401);
    });
  });
});
