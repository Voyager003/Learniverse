import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ERROR_MESSAGES } from '../src/common/constants/error-messages.constant';

// Type-safe response interfaces for supertest body assertions
interface SuccessBody<T> {
  data: T;
  statusCode: number;
}

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let mongoConnection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror main.ts global configuration
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    dataSource = moduleFixture.get(DataSource);
    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    // Clean up test databases
    if (dataSource?.isInitialized) {
      await dataSource.dropDatabase();
      await dataSource.destroy();
    }
    if (mongoConnection) {
      await mongoConnection.dropDatabase();
    }
    await app.close();
  });

  // --- Register ---

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('회원가입 성공 시 201과 토큰 쌍을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      const body = res.body as SuccessBody<AuthTokens>;
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      expect(typeof body.data.accessToken).toBe('string');
      expect(typeof body.data.refreshToken).toBe('string');
      expect(body.statusCode).toBe(201);
    });

    it('중복 이메일로 가입 시 409를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(409);

      const body = res.body as ErrorBody;
      expect(body.statusCode).toBe(409);
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

    it('허용되지 않은 필드가 포함되면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'extra@example.com', role: 'ADMIN' })
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

      const body = res.body as SuccessBody<AuthTokens>;
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      expect(body.statusCode).toBe(200);
    });

    it('잘못된 비밀번호로 로그인 시 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' })
        .expect(401);

      const body = res.body as ErrorBody;
      expect(body.statusCode).toBe(401);
      expect(body.message).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });

    it('존재하지 않는 이메일로 로그인 시 401을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);

      const body = res.body as ErrorBody;
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

      const body = res.body as SuccessBody<AuthTokens>;
      refreshToken = body.data.refreshToken;
    });

    it('유효한 리프레시 토큰으로 갱신 시 200과 새 토큰 쌍을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      const body = res.body as SuccessBody<AuthTokens>;
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      // Save new refresh token for subsequent tests
      refreshToken = body.data.refreshToken;
    });

    it('Authorization 헤더 없이 갱신 시 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });

    it('잘못된 리프레시 토큰으로 갱신 시 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
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

      const body = res.body as SuccessBody<AuthTokens>;
      accessToken = body.data.accessToken;
      refreshToken = body.data.refreshToken;
    });

    it('인증된 사용자가 로그아웃 시 204를 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('로그아웃 후 리프레시 토큰이 무효화된다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });

    it('인증 없이 로그아웃 시 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });
});
