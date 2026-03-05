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
import { promoteToTutor } from './helpers/seed-helpers';
import {
  SuccessBody,
  ErrorBody,
  AuthTokens,
  PaginatedData,
} from './helpers/test-interfaces';
import {
  expectErrorEnvelope,
  expectSuccessEnvelope,
} from './helpers/assert-response';
import {
  assertEnrollmentCount,
  assertEnrollmentState,
  getUserIdByEmail,
} from './helpers/db-assertions';
import { EnrollmentStatus } from '../src/common/enums';

interface EnrollmentData {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
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
  let raceStudentToken: string;
  let publishedCourseId: string;
  let unpublishedCourseId: string;
  let enrollmentId: string;
  let studentId: string;
  let raceStudentId: string;

  const registerAndLoginStudent = async (
    label: string,
  ): Promise<{ token: string; email: string }> => {
    const nonce = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const safeLabel = label.toLowerCase().replace(/\s+/g, '-');
    const email = `${safeLabel}-${nonce}@test.com`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        name: `${label} ${nonce}`,
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const token = expectSuccessEnvelope<AuthTokens>(loginRes, 200).data
      .accessToken;

    return { token, email };
  };

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

    await promoteToTutor(dataSource, 'enroll-tutor@test.com');

    const tutorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'enroll-tutor@test.com', password: 'password123' });
    tutorToken = expectSuccessEnvelope<AuthTokens>(tutorLogin, 200).data
      .accessToken;

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
    studentToken = expectSuccessEnvelope<AuthTokens>(studentLogin, 200).data
      .accessToken;
    studentId = await getUserIdByEmail(dataSource, 'enroll-student@test.com');

    // 5. Register fresh STUDENT (no enrollments) + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'enroll-fresh@test.com',
      password: 'password123',
      name: 'Fresh Student',
    });

    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'enroll-fresh@test.com', password: 'password123' });
    freshStudentToken = expectSuccessEnvelope<AuthTokens>(freshLogin, 200).data
      .accessToken;

    // 6. Register race STUDENT (for concurrency test only)
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'enroll-race@test.com',
      password: 'password123',
      name: 'Race Student',
    });

    const raceLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'enroll-race@test.com', password: 'password123' });
    raceStudentToken = expectSuccessEnvelope<AuthTokens>(raceLogin, 200).data
      .accessToken;
    raceStudentId = await getUserIdByEmail(dataSource, 'enroll-race@test.com');
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
      await assertEnrollmentState(
        dataSource,
        studentId,
        publishedCourseId,
        EnrollmentStatus.ACTIVE,
        0,
      );
    });

    it('동일 강좌에 중복 등록하면 409를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: publishedCourseId })
        .expect(409);

      const body = expectErrorEnvelope(
        res,
        409,
        ERROR_MESSAGES.ALREADY_ENROLLED,
      );
      expect(body.message).toBe(ERROR_MESSAGES.ALREADY_ENROLLED);
    });

    it('동일 강좌 등록 요청을 동시에 보내면 1건만 성공한다', async () => {
      const raceCourseRes = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Enrollment Race Course',
          description: 'for concurrency test',
          category: 'programming',
          difficulty: 'beginner',
        })
        .expect(201);
      const raceCourseId = (raceCourseRes.body as SuccessBody<CourseData>).data
        .id;

      await request(app.getHttpServer())
        .patch(`/api/v1/courses/${raceCourseId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ isPublished: true })
        .expect(200);

      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/enrollments')
          .set('Authorization', `Bearer ${raceStudentToken}`)
          .send({ courseId: raceCourseId }),
        request(app.getHttpServer())
          .post('/api/v1/enrollments')
          .set('Authorization', `Bearer ${raceStudentToken}`)
          .send({ courseId: raceCourseId }),
      ]);

      const statuses = [r1.status, r2.status].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409]);
      await assertEnrollmentCount(dataSource, raceStudentId, raceCourseId, 1);
    });

    it('동일 Idempotency-Key로 재시도하면 같은 수강 등록 결과를 반환한다', async () => {
      const email = `enroll-idem-${Date.now()}@test.com`;

      await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email,
        password: 'password123',
        name: 'Idempotent Student',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' })
        .expect(200);
      const token = expectSuccessEnvelope<AuthTokens>(loginRes, 200).data
        .accessToken;
      const userId = await getUserIdByEmail(dataSource, email);

      const key = `enroll-idempotency-${Date.now()}`;

      const first = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send({ courseId: publishedCourseId })
        .expect(201);
      const firstBody = first.body as SuccessBody<EnrollmentData>;

      const second = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send({ courseId: publishedCourseId })
        .expect(201);
      const secondBody = second.body as SuccessBody<EnrollmentData>;

      expect(secondBody.data.id).toBe(firstBody.data.id);
      await assertEnrollmentCount(dataSource, userId, publishedCourseId, 1);
    });

    it('동일 Idempotency-Key를 다른 payload로 재사용하면 409를 반환한다', async () => {
      const key = `enroll-idempotency-mismatch-${Date.now()}`;
      const { token: mismatchStudentToken } = await registerAndLoginStudent(
        'Idempotency Mismatch Student',
      );

      const courseRes = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Idempotency Mismatch Course',
          description: 'for idempotency mismatch test',
          category: 'business',
          difficulty: 'beginner',
        })
        .expect(201);
      const courseId = (courseRes.body as SuccessBody<CourseData>).data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ isPublished: true })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${mismatchStudentToken}`)
        .set('Idempotency-Key', key)
        .send({ courseId: publishedCourseId })
        .expect(201);

      const mismatch = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${mismatchStudentToken}`)
        .set('Idempotency-Key', key)
        .send({ courseId })
        .expect(409);

      expectErrorEnvelope(
        mismatch,
        409,
        ERROR_MESSAGES.IDEMPOTENCY_KEY_PAYLOAD_MISMATCH,
      );
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
      const { token: emptyStudentToken } =
        await registerAndLoginStudent('Empty List Student');

      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my')
        .set('Authorization', `Bearer ${emptyStudentToken}`)
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

    it('동시에 out-of-order 업데이트가 와도 진행률은 역행하지 않는다', async () => {
      const email = `progress-race-${Date.now()}@test.com`;
      await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email,
        password: 'password123',
        name: 'Progress Race Student',
      });
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' })
        .expect(200);
      const token = expectSuccessEnvelope<AuthTokens>(loginRes, 200).data
        .accessToken;

      const enrollRes = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: publishedCourseId })
        .expect(201);
      const raceEnrollmentId = (enrollRes.body as SuccessBody<EnrollmentData>)
        .data.id;

      await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/v1/enrollments/${raceEnrollmentId}/progress`)
          .set('Authorization', `Bearer ${token}`)
          .send({ progress: 80 })
          .expect(200),
        request(app.getHttpServer())
          .patch(`/api/v1/enrollments/${raceEnrollmentId}/progress`)
          .set('Authorization', `Bearer ${token}`)
          .send({ progress: 20 })
          .expect(200),
      ]);

      const myRes = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const myBody = myRes.body as SuccessBody<PaginatedData<EnrollmentData>>;
      const enrollment = myBody.data.data.find(
        (e) => e.id === raceEnrollmentId,
      );

      expect(enrollment).toBeDefined();
      expect(enrollment?.progress).toBe(80);
      expect(enrollment?.status).toBe('active');
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
      await assertEnrollmentState(
        dataSource,
        studentId,
        publishedCourseId,
        EnrollmentStatus.COMPLETED,
        100,
      );
    });

    it('COMPLETED 상태에서 진행률을 업데이트하면 400을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ progress: 80 })
        .expect(400);

      const body = expectErrorEnvelope(
        res,
        400,
        ERROR_MESSAGES.ENROLLMENT_NOT_ACTIVE,
      );
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
      const { token: validationStudentToken } = await registerAndLoginStudent(
        'Progress Validation Student',
      );

      const enrollRes = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${validationStudentToken}`)
        .send({ courseId: publishedCourseId })
        .expect(201);
      const freshEnrollmentId = expectSuccessEnvelope<EnrollmentData>(
        enrollRes,
        201,
      ).data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${freshEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${validationStudentToken}`)
        .send({ progress: -1 })
        .expect(400);
    });

    it('100 초과 progress 값으로 업데이트하면 400을 반환한다', async () => {
      const { token: validationStudentToken } = await registerAndLoginStudent(
        'Progress Over Limit Student',
      );

      const enrollRes = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${validationStudentToken}`)
        .send({ courseId: publishedCourseId })
        .expect(201);
      const freshEnrollmentId = expectSuccessEnvelope<EnrollmentData>(
        enrollRes,
        201,
      ).data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${freshEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${validationStudentToken}`)
        .send({ progress: 101 })
        .expect(400);
    });

    it('progress 필드 누락 시 400을 반환한다', async () => {
      const { token: validationStudentToken } = await registerAndLoginStudent(
        'Progress Missing Field Student',
      );

      const enrollRes = await request(app.getHttpServer())
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${validationStudentToken}`)
        .send({ courseId: publishedCourseId })
        .expect(201);
      const freshEnrollmentId = expectSuccessEnvelope<EnrollmentData>(
        enrollRes,
        201,
      ).data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${freshEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${validationStudentToken}`)
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
