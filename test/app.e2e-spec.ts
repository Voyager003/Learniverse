import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  teardownTestApp,
  TestContext,
} from './helpers/create-app';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it('GET /api/v1/health 헬스체크가 200을 반환한다', () => {
    return request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });
});
