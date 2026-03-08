import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { IDEMPOTENCY_STATUS } from '../src/common/idempotency/entities/idempotency-key.entity';
import {
  createTestApp,
  teardownTestApp,
  TestContext,
} from './helpers/create-app';
import {
  createAdminAndLogin,
  createCourse,
  createStudentAndLogin,
  createTutorAndLogin,
  enrollStudent,
} from './helpers/admin-helpers';
import {
  expectErrorEnvelope,
  expectSuccessEnvelope,
} from './helpers/assert-response';
import { assertIdempotencyKeyCount } from './helpers/db-assertions';
import { PaginatedData } from './helpers/test-interfaces';

interface EnrollmentData {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
}

interface IdempotencyKeyData {
  id: string;
  userId: string;
  path: string;
  status: string;
  responseStatus: number | null;
  responseBody: Record<string, unknown> | null;
}

describe('Admin Operations (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;
  let adminToken: string;
  let studentToken: string;
  let studentId: string;
  let tutorToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;

    const admin = await createAdminAndLogin(app, dataSource, {
      label: 'Admin Operations Root',
    });
    const tutor = await createTutorAndLogin(app, dataSource, {
      label: 'Admin Operations Tutor',
    });
    const student = await createStudentAndLogin(app, {
      label: 'Admin Operations Student',
    });

    adminToken = admin.accessToken;
    tutorToken = tutor.accessToken;
    studentToken = student.accessToken;
    studentId = student.userId;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it('관리자는 수강 목록과 상세를 조회할 수 있다', async () => {
    const courseId = await createCourse(app, tutorToken, {
      title: 'Operations Course',
    });
    const enrollmentId = await enrollStudent(app, studentToken, courseId);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/admin/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ studentId, courseId, status: 'active' })
      .expect(200);

    const listBody = expectSuccessEnvelope<PaginatedData<EnrollmentData>>(
      listRes,
      200,
    );
    expect(listBody.data.data.some((item) => item.id === enrollmentId)).toBe(
      true,
    );

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const detailBody = expectSuccessEnvelope<EnrollmentData>(detailRes, 200);
    expect(detailBody.data.id).toBe(enrollmentId);
  });

  it('관리자는 멱등성 키 목록을 조회할 수 있다', async () => {
    const courseId = await createCourse(app, tutorToken, {
      title: 'Idempotency Course',
    });
    const key = `idem-${Date.now()}`;
    await enrollStudent(app, studentToken, courseId, key);

    await assertIdempotencyKeyCount(
      dataSource,
      studentId,
      '/api/v1/enrollments',
      1,
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/idempotency-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        userId: studentId,
        path: '/api/v1/enrollments',
        status: IDEMPOTENCY_STATUS.COMPLETED,
      })
      .expect(200);

    const body = expectSuccessEnvelope<PaginatedData<IdempotencyKeyData>>(
      res,
      200,
    );
    expect(
      body.data.data.some(
        (record) =>
          record.userId === studentId &&
          record.path === '/api/v1/enrollments' &&
          record.status === IDEMPOTENCY_STATUS.COMPLETED,
      ),
    ).toBe(true);
  });

  it('관리자가 아닌 사용자는 운영 조회 API에 접근할 수 없다', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);

    expectErrorEnvelope(res, 403);
  });
});
