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

interface CourseData {
  id: string;
  title: string;
}

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  courseId: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionData {
  id: string;
  studentId: string;
  assignmentId: string;
  content: string;
  fileUrls: string[];
  status: string;
  feedback: string | null;
  score: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

describe('Assignments & Submissions (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;

  // Shared state
  let tutorToken: string;
  let otherTutorToken: string;
  let studentToken: string;
  let unenrolledStudentToken: string;
  let courseId: string;
  let assignmentId: string;
  let submissionId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;

    // --- Seed test data ---

    // 1. TUTOR + promote + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'assign-tutor@test.com',
      password: 'password123',
      name: 'Assign Tutor',
    });
    await dataSource.query(`UPDATE users SET role = $1 WHERE email = $2`, [
      Role.TUTOR,
      'assign-tutor@test.com',
    ]);
    const tutorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'assign-tutor@test.com', password: 'password123' });
    tutorToken = (tutorLogin.body as SuccessBody<AuthTokens>).data.accessToken;

    // 2. Other TUTOR + promote + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'assign-other-tutor@test.com',
      password: 'password123',
      name: 'Other Tutor',
    });
    await dataSource.query(`UPDATE users SET role = $1 WHERE email = $2`, [
      Role.TUTOR,
      'assign-other-tutor@test.com',
    ]);
    const otherTutorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'assign-other-tutor@test.com', password: 'password123' });
    otherTutorToken = (otherTutorLogin.body as SuccessBody<AuthTokens>).data
      .accessToken;

    // 3. STUDENT (will be enrolled) + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'assign-student@test.com',
      password: 'password123',
      name: 'Assign Student',
    });
    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'assign-student@test.com', password: 'password123' });
    studentToken = (studentLogin.body as SuccessBody<AuthTokens>).data
      .accessToken;

    // 4. Unenrolled STUDENT + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'assign-unenrolled@test.com',
      password: 'password123',
      name: 'Unenrolled Student',
    });
    const unenrolledLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'assign-unenrolled@test.com', password: 'password123' });
    unenrolledStudentToken = (unenrolledLogin.body as SuccessBody<AuthTokens>)
      .data.accessToken;

    // 5. Create course + publish
    const courseRes = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        title: 'Assignment Test Course',
        description: 'Course for assignment & submission testing',
        category: 'programming',
        difficulty: 'intermediate',
      });
    courseId = (courseRes.body as SuccessBody<CourseData>).data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ isPublished: true });

    // 6. Enroll STUDENT
    await request(app.getHttpServer())
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ courseId });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  // =============================================
  // Assignments
  // =============================================

  // --- POST /courses/:cid/assignments ---

  describe('POST /api/v1/courses/:cid/assignments', () => {
    it('소유자 TUTOR가 과제를 생성하면 201을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'NestJS Guard 구현',
          description: 'JwtAuthGuard를 직접 구현해보세요.',
        })
        .expect(201);

      const body = res.body as SuccessBody<AssignmentData>;
      expect(body.data.title).toBe('NestJS Guard 구현');
      expect(body.data.description).toBe('JwtAuthGuard를 직접 구현해보세요.');
      expect(body.data.courseId).toBe(courseId);
      expect(body.data.dueDate).toBeNull();
      assignmentId = body.data.id;
    });

    it('dueDate를 포함하여 과제를 생성할 수 있다', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Due Date Assignment',
          description: 'Assignment with due date',
          dueDate: futureDate.toISOString(),
        })
        .expect(201);

      const body = res.body as SuccessBody<AssignmentData>;
      expect(body.data.dueDate).not.toBeNull();
    });

    it('필수 필드 누락 시 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'Missing Description' })
        .expect(400);
    });

    it('다른 TUTOR가 과제를 생성하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .send({
          title: 'Unauthorized Assignment',
          description: 'Should fail',
        })
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_COURSE_OWNER);
    });

    it('STUDENT가 과제를 생성하면 403을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Assignment',
          description: 'Should fail',
        })
        .expect(403);
    });

    it('존재하지 않는 courseId로 과제를 생성하면 404를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(
          '/api/v1/courses/00000000-0000-0000-0000-000000000000/assignments',
        )
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Ghost Course Assignment',
          description: 'Should fail',
        })
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.COURSE_NOT_FOUND);
    });

    it('인증 없이 과제를 생성하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/assignments`)
        .send({
          title: 'No Auth Assignment',
          description: 'Should fail',
        })
        .expect(401);
    });
  });

  // --- GET /courses/:cid/assignments ---

  describe('GET /api/v1/courses/:cid/assignments', () => {
    it('수강 중인 STUDENT가 과제 목록을 조회하면 200을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const body = res.body as SuccessBody<AssignmentData[]>;
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].courseId).toBe(courseId);
    });

    it('소유자 TUTOR가 과제 목록을 조회하면 200을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      const body = res.body as SuccessBody<AssignmentData[]>;
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('미수강 STUDENT가 과제 목록을 조회하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${unenrolledStudentToken}`)
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
    });

    it('다른 TUTOR가 과제 목록을 조회하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_COURSE_OWNER);
    });

    it('인증 없이 과제 목록을 조회하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}/assignments`)
        .expect(401);
    });
  });

  // =============================================
  // Submissions
  // =============================================

  // --- POST /assignments/:aid/submissions ---

  describe('POST /api/v1/assignments/:aid/submissions', () => {
    it('수강 중인 STUDENT가 과제를 제출하면 201과 SUBMITTED 상태를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '과제 답안입니다.' })
        .expect(201);

      const body = res.body as SuccessBody<SubmissionData>;
      expect(body.data.assignmentId).toBe(assignmentId);
      expect(body.data.content).toBe('과제 답안입니다.');
      expect(body.data.status).toBe('submitted');
      expect(body.data.feedback).toBeNull();
      expect(body.data.score).toBeNull();
      expect(body.data.fileUrls).toEqual([]);
      submissionId = body.data.id;
    });

    it('동일 과제에 중복 제출하면 409를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Duplicate submission' })
        .expect(409);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.ALREADY_SUBMITTED);
    });

    it('미수강 STUDENT가 제출하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${unenrolledStudentToken}`)
        .send({ content: 'Should fail' })
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
    });

    it('TUTOR가 제출하면 403을 반환한다 (RolesGuard)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ content: 'Tutor submit' })
        .expect(403);
    });

    it('content 누락 시 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(400);
    });

    it('존재하지 않는 assignmentId로 제출하면 404를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(
          '/api/v1/assignments/00000000-0000-0000-0000-000000000000/submissions',
        )
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Ghost assignment' })
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);
    });

    it('인증 없이 제출하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignmentId}/submissions`)
        .send({ content: 'No auth' })
        .expect(401);
    });
  });

  // --- GET /assignments/:aid/submissions ---

  describe('GET /api/v1/assignments/:aid/submissions', () => {
    it('수강 중인 STUDENT가 조회하면 자신의 제출만 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const body = res.body as SuccessBody<SubmissionData[]>;
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(submissionId);
    });

    it('소유자 TUTOR가 조회하면 전체 제출 목록을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      const body = res.body as SuccessBody<SubmissionData[]>;
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('미수강 STUDENT가 조회하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${unenrolledStudentToken}`)
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
    });

    it('다른 TUTOR가 조회하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_COURSE_OWNER);
    });

    it('인증 없이 조회하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/assignments/${assignmentId}/submissions`)
        .expect(401);
    });
  });

  // --- POST /assignments/:aid/submissions/:sid/feedback ---

  describe('POST /api/v1/assignments/:aid/submissions/:sid/feedback', () => {
    it('소유자 TUTOR가 score 없이 피드백하면 201과 RETURNED 상태를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${assignmentId}/submissions/${submissionId}/feedback`,
        )
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ feedback: '보완이 필요합니다.' })
        .expect(201);

      const body = res.body as SuccessBody<SubmissionData>;
      expect(body.data.feedback).toBe('보완이 필요합니다.');
      expect(body.data.status).toBe('returned');
      expect(body.data.score).toBeNull();
      expect(body.data.reviewedAt).not.toBeNull();
    });

    it('소유자 TUTOR가 score 포함 피드백하면 201과 REVIEWED 상태를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${assignmentId}/submissions/${submissionId}/feedback`,
        )
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ feedback: '잘 작성하셨습니다.', score: 95 })
        .expect(201);

      const body = res.body as SuccessBody<SubmissionData>;
      expect(body.data.feedback).toBe('잘 작성하셨습니다.');
      expect(body.data.score).toBe(95);
      expect(body.data.status).toBe('reviewed');
      expect(body.data.reviewedAt).not.toBeNull();
    });

    it('이미 REVIEWED 상태인 제출에 피드백하면 409를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${assignmentId}/submissions/${submissionId}/feedback`,
        )
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ feedback: 'Again', score: 80 })
        .expect(409);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.SUBMISSION_ALREADY_REVIEWED);
    });

    it('다른 TUTOR가 피드백하면 403을 반환한다', async () => {
      // Need a new submission in SUBMITTED status for this test
      // Create a second assignment, submit, then try feedback with other tutor
      const assignRes = await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Ownership Test Assignment',
          description: 'For testing feedback ownership',
        });
      const newAssignmentId = (assignRes.body as SuccessBody<AssignmentData>)
        .data.id;

      const subRes = await request(app.getHttpServer())
        .post(`/api/v1/assignments/${newAssignmentId}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Ownership test submission' });
      const newSubmissionId = (subRes.body as SuccessBody<SubmissionData>).data
        .id;

      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${newAssignmentId}/submissions/${newSubmissionId}/feedback`,
        )
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .send({ feedback: 'Unauthorized feedback', score: 50 })
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_COURSE_OWNER);
    });

    it('STUDENT가 피드백하면 403을 반환한다 (RolesGuard)', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${assignmentId}/submissions/${submissionId}/feedback`,
        )
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ feedback: 'Student feedback', score: 100 })
        .expect(403);
    });

    it('존재하지 않는 submissionId로 피드백하면 404를 반환한다', async () => {
      const fakeMongoId = '000000000000000000000000';

      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${assignmentId}/submissions/${fakeMongoId}/feedback`,
        )
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ feedback: 'Ghost submission', score: 50 })
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    });

    it('feedback 필드 누락 시 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${assignmentId}/submissions/${submissionId}/feedback`,
        )
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({})
        .expect(400);
    });

    it('인증 없이 피드백하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${assignmentId}/submissions/${submissionId}/feedback`,
        )
        .send({ feedback: 'No auth', score: 50 })
        .expect(401);
    });
  });
});
