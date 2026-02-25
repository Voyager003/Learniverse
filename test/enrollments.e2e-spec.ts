import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ERROR_MESSAGES } from '../src/common/constants/error-messages.constant';
import { Role } from '../src/common/enums';
import {
  createTestApp,
  teardownTestApp,
  TestContext,
} from './helpers/create-app';

// Type-safe response interfaces
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

interface EnrollmentData {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface CourseData {
  id: string;
  title: string;
}

describe('Enrollments (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;

  // Shared state across tests
  let studentToken: string;
  let tutorToken: string;
  let freshStudentToken: string;
  let publishedCourseId: string;
  let unpublishedCourseId: string;
  let enrollmentId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;

    // --- Seed test data ---

    // 1. Register TUTOR + promote + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'enroll-tutor@test.com',
      password: 'password123',
      name: 'Enroll Tutor',
    });

    await dataSource.query(`UPDATE users SET role = $1 WHERE email = $2`, [
      Role.TUTOR,
      'enroll-tutor@test.com',
    ]);

    const tutorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'enroll-tutor@test.com', password: 'password123' });
    tutorToken = (tutorLogin.body as SuccessBody<AuthTokens>).data.accessToken;

    // 2. Create published course
    const courseRes = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        title: 'Test Course',
        description: 'A course for enrollment testing',
        category: 'programming',
        difficulty: 'beginner',
      });
    publishedCourseId = (courseRes.body as SuccessBody<CourseData>).data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/courses/${publishedCourseId}`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ isPublished: true });

    // 3. Create unpublished course
    const unpubCourseRes = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        title: 'Unpublished Course',
        description: 'Not published yet',
        category: 'design',
        difficulty: 'advanced',
      });
    unpublishedCourseId = (unpubCourseRes.body as SuccessBody<CourseData>).data
      .id;

    // 4. Register STUDENT + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'enroll-student@test.com',
      password: 'password123',
      name: 'Enroll Student',
    });

    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'enroll-student@test.com', password: 'password123' });
    studentToken = (studentLogin.body as SuccessBody<AuthTokens>).data
      .accessToken;

    // 5. Register fresh STUDENT (no enrollments) + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'enroll-fresh@test.com',
      password: 'password123',
      name: 'Fresh Student',
    });

    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'enroll-fresh@test.com', password: 'password123' });
    freshStudentToken = (freshLogin.body as SuccessBody<AuthTokens>).data
      .accessToken;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  // --- POST /enrollments ---

  describe('POST /api/v1/enrollments', () => {
    it('STUDENT가 공개 강좌에 수강 등록하면 201과 ACTIVE 상태를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: publishedCourseId })
        .expect(201);

      const body = res.body as SuccessBody<EnrollmentData>;
      expect(body.data.courseId).toBe(publishedCourseId);
      expect(body.data.status).toBe('active');
      expect(body.data.progress).toBe(0);
      enrollmentId = body.data.id;
    });

    it('동일 강좌에 중복 등록하면 409를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: publishedCourseId })
        .expect(409);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.ALREADY_ENROLLED);
    });

    it('존재하지 않는 강좌에 등록하면 404를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.COURSE_NOT_FOUND);
    });

    it('비공개 강좌에 등록하면 404를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: unpublishedCourseId })
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.COURSE_NOT_FOUND);
    });

    it('TUTOR가 수강 등록하면 403을 반환한다 (RolesGuard)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ courseId: publishedCourseId })
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.statusCode).toBe(403);
    });

    it('인증 없이 수강 등록하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .send({ courseId: publishedCourseId })
        .expect(401);
    });

    it('courseId 누락 시 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(400);
    });

    it('잘못된 UUID 형식의 courseId로 등록하면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: 'not-a-uuid' })
        .expect(400);
    });
  });

  // --- GET /enrollments/my ---

  describe('GET /api/v1/enrollments/my', () => {
    it('수강 등록한 STUDENT의 목록을 페이지네이션으로 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const body = res.body as SuccessBody<PaginatedData<EnrollmentData>>;
      expect(body.data.total).toBeGreaterThanOrEqual(1);
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(10);
      expect(body.data.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data.data[0].courseId).toBe(publishedCourseId);
    });

    it('커스텀 페이지네이션 파라미터가 동작한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my?page=1&limit=5')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const body = res.body as SuccessBody<PaginatedData<EnrollmentData>>;
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(5);
    });

    it('수강 등록이 없는 STUDENT는 빈 목록을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my')
        .set('Authorization', `Bearer ${freshStudentToken}`)
        .expect(200);

      const body = res.body as SuccessBody<PaginatedData<EnrollmentData>>;
      expect(body.data.total).toBe(0);
      expect(body.data.data).toHaveLength(0);
    });

    it('인증 없이 조회하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/enrollments/my')
        .expect(401);
    });
  });

  // --- PATCH /enrollments/:id/progress ---

  describe('PATCH /api/v1/enrollments/:id/progress', () => {
    it('진행률을 50으로 업데이트하면 200과 ACTIVE 상태를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ progress: 50 })
        .expect(200);

      const body = res.body as SuccessBody<EnrollmentData>;
      expect(body.data.progress).toBe(50);
      expect(body.data.status).toBe('active');
    });

    it('진행률을 100으로 업데이트하면 자동으로 COMPLETED 상태가 된다', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ progress: 100 })
        .expect(200);

      const body = res.body as SuccessBody<EnrollmentData>;
      expect(body.data.progress).toBe(100);
      expect(body.data.status).toBe('completed');
    });

    it('COMPLETED 상태에서 진행률을 업데이트하면 400을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ progress: 80 })
        .expect(400);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.ENROLLMENT_NOT_ACTIVE);
    });

    it('다른 STUDENT의 enrollment을 업데이트하면 404를 반환한다', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${freshStudentToken}`)
        .send({ progress: 10 })
        .expect(404);
    });

    it('존재하지 않는 enrollment ID로 업데이트하면 404를 반환한다', async () => {
      await request(app.getHttpServer())
        .patch(
          '/api/v1/enrollments/00000000-0000-0000-0000-000000000000/progress',
        )
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ progress: 10 })
        .expect(404);
    });

    it('음수 progress 값으로 업데이트하면 400을 반환한다', async () => {
      // Need a new active enrollment for validation tests
      const enrollRes = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${freshStudentToken}`)
        .send({ courseId: publishedCourseId });
      const freshEnrollmentId = (enrollRes.body as SuccessBody<EnrollmentData>)
        .data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${freshEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${freshStudentToken}`)
        .send({ progress: -1 })
        .expect(400);
    });

    it('100 초과 progress 값으로 업데이트하면 400을 반환한다', async () => {
      // freshStudent already has an active enrollment from the previous test
      const myRes = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my')
        .set('Authorization', `Bearer ${freshStudentToken}`);
      const freshEnrollmentId = (
        myRes.body as SuccessBody<PaginatedData<EnrollmentData>>
      ).data.data[0].id;

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${freshEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${freshStudentToken}`)
        .send({ progress: 101 })
        .expect(400);
    });

    it('progress 필드 누락 시 400을 반환한다', async () => {
      const myRes = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my')
        .set('Authorization', `Bearer ${freshStudentToken}`);
      const freshEnrollmentId = (
        myRes.body as SuccessBody<PaginatedData<EnrollmentData>>
      ).data.data[0].id;

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${freshEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${freshStudentToken}`)
        .send({})
        .expect(400);
    });

    it('TUTOR가 진행률을 업데이트하면 403을 반환한다', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ progress: 10 })
        .expect(403);
    });
  });
});
