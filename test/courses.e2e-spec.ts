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
  assertCoursePublishedState,
  assertLectureCountByCourseAndOrder,
} from './helpers/db-assertions';

interface CourseData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  isPublished: boolean;
  tutorId: string;
  lectures?: LectureData[];
  createdAt: string;
  updatedAt: string;
}

interface LectureData {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  order: number;
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

describe('Courses & Lectures (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;

  // Shared state across tests
  let tutorToken: string;
  let otherTutorToken: string;
  let studentToken: string;
  let courseId: string;
  let lectureId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;

    // --- Seed test data ---

    // 1. Register TUTOR + promote + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'courses-tutor@test.com',
      password: 'password123',
      name: 'Courses Tutor',
    });

    await promoteToTutor(dataSource, 'courses-tutor@test.com');

    const tutorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'courses-tutor@test.com', password: 'password123' });
    tutorToken = expectSuccessEnvelope<AuthTokens>(tutorLogin, 200).data
      .accessToken;

    // 2. Register other TUTOR + promote + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'courses-other-tutor@test.com',
      password: 'password123',
      name: 'Other Tutor',
    });

    await promoteToTutor(dataSource, 'courses-other-tutor@test.com');

    const otherTutorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'courses-other-tutor@test.com',
        password: 'password123',
      });
    otherTutorToken = expectSuccessEnvelope<AuthTokens>(otherTutorLogin, 200)
      .data.accessToken;

    // 3. Register STUDENT + login
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'courses-student@test.com',
      password: 'password123',
      name: 'Courses Student',
    });

    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'courses-student@test.com', password: 'password123' });
    studentToken = expectSuccessEnvelope<AuthTokens>(studentLogin, 200).data
      .accessToken;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  // --- POST /courses ---

  describe('POST /api/v1/courses', () => {
    it('TUTOR가 강좌를 생성하면 201과 isPublished: false인 강좌를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'NestJS 기초',
          description: 'NestJS를 처음 배우는 강좌',
          category: 'programming',
          difficulty: 'beginner',
        })
        .expect(201);

      const body = res.body as SuccessBody<CourseData>;
      expect(body.data.title).toBe('NestJS 기초');
      expect(body.data.description).toBe('NestJS를 처음 배우는 강좌');
      expect(body.data.category).toBe('programming');
      expect(body.data.difficulty).toBe('beginner');
      expect(body.data.isPublished).toBe(false);
      expect(body.data.id).toBeDefined();
      courseId = body.data.id;
      await assertCoursePublishedState(dataSource, courseId, false);
    });

    it('필수 필드 누락 시 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'Incomplete Course' })
        .expect(400);
    });

    it('STUDENT가 강좌를 생성하면 403을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Course',
          description: 'Should fail',
          category: 'programming',
          difficulty: 'beginner',
        })
        .expect(403);
    });

    it('인증 없이 강좌를 생성하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/courses')
        .send({
          title: 'No Auth Course',
          description: 'Should fail',
          category: 'programming',
          difficulty: 'beginner',
        })
        .expect(401);
    });
  });

  // --- GET /courses ---

  describe('GET /api/v1/courses', () => {
    // Create additional courses for filtering tests
    beforeAll(async () => {
      // Create a data_science course
      await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Data Science 입문',
          description: '데이터 과학 강좌',
          category: 'data_science',
          difficulty: 'intermediate',
        });

      // Publish the main course
      await request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ isPublished: true });
    });

    it('공개 강좌만 페이지네이션으로 반환한다 (비공개 강좌 미포함)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses')
        .expect(200);

      const body = res.body as SuccessBody<PaginatedData<CourseData>>;
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(10);
      // Only the published course should appear
      expect(body.data.total).toBe(1);
      expect(body.data.data.length).toBe(1);
      expect(body.data.data[0].isPublished).toBe(true);
    });

    it('category 필터가 동작한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses?category=programming')
        .expect(200);

      const body = res.body as SuccessBody<PaginatedData<CourseData>>;
      expect(body.data.data.length).toBeGreaterThanOrEqual(1);
      for (const course of body.data.data) {
        expect(course.category).toBe('programming');
      }
    });

    it('difficulty 필터가 동작한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses?difficulty=beginner')
        .expect(200);

      const body = res.body as SuccessBody<PaginatedData<CourseData>>;
      for (const course of body.data.data) {
        expect(course.difficulty).toBe('beginner');
      }
    });

    it('인증 없이도 접근 가능하다 (@Public)', async () => {
      await request(app.getHttpServer()).get('/api/v1/courses').expect(200);
    });
  });

  // --- GET /courses/:id ---

  describe('GET /api/v1/courses/:id', () => {
    it('공개 강좌 상세를 lectures 관계 포함하여 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);

      const body = res.body as SuccessBody<CourseData>;
      expect(body.data.id).toBe(courseId);
      expect(body.data.title).toBe('NestJS 기초');
      expect(body.data.isPublished).toBe(true);
      expect(body.data.lectures).toBeDefined();
      expect(Array.isArray(body.data.lectures)).toBe(true);
    });

    it('비공개 강좌 조회 시 404를 반환한다', async () => {
      // Create an unpublished course
      const unpublishedRes = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Unpublished Course',
          description: 'Not published yet',
          category: 'design',
          difficulty: 'advanced',
        });

      const unpublishedId = (unpublishedRes.body as SuccessBody<CourseData>)
        .data.id;

      await request(app.getHttpServer())
        .get(`/api/v1/courses/${unpublishedId}`)
        .expect(404);
    });

    it('존재하지 않는 ID로 조회 시 404를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses/00000000-0000-0000-0000-000000000000')
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.COURSE_NOT_FOUND);
    });

    it('인증 없이도 접근 가능하다 (@Public)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);
    });
  });

  // --- PATCH /courses/:id ---

  describe('PATCH /api/v1/courses/:id', () => {
    it('소유자 TUTOR가 강좌를 수정하면 200과 수정된 데이터를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'NestJS 기초 (수정됨)' })
        .expect(200);

      const body = res.body as SuccessBody<CourseData>;
      expect(body.data.title).toBe('NestJS 기초 (수정됨)');
      expect(body.data.id).toBe(courseId);
    });

    it('isPublished: true로 공개 전환이 가능하다', async () => {
      // Create a new unpublished course for this test
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Publish Test Course',
          description: 'Test publishing',
          category: 'business',
          difficulty: 'beginner',
        });

      const newCourseId = (createRes.body as SuccessBody<CourseData>).data.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/courses/${newCourseId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ isPublished: true })
        .expect(200);

      const body = res.body as SuccessBody<CourseData>;
      expect(body.data.isPublished).toBe(true);
      await assertCoursePublishedState(dataSource, newCourseId, true);
    });

    it('다른 TUTOR가 수정하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .send({ title: 'Hijacked' })
        .expect(403);

      const body = expectErrorEnvelope(
        res,
        403,
        ERROR_MESSAGES.NOT_COURSE_OWNER,
      );
      expect(body.message).toBe(ERROR_MESSAGES.NOT_COURSE_OWNER);
    });

    it('STUDENT가 수정하면 403을 반환한다', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Student Edit' })
        .expect(403);
    });

    it('존재하지 않는 ID를 수정하면 404를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/courses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'Ghost Course' })
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.COURSE_NOT_FOUND);
    });
  });

  // --- DELETE /courses/:id ---

  describe('DELETE /api/v1/courses/:id', () => {
    let deletableCourseId: string;

    beforeAll(async () => {
      // Create a course specifically for deletion tests
      const res = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Deletable Course',
          description: 'To be deleted',
          category: 'marketing',
          difficulty: 'beginner',
        });
      deletableCourseId = (res.body as SuccessBody<CourseData>).data.id;
    });

    it('다른 TUTOR가 삭제하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/courses/${deletableCourseId}`)
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_COURSE_OWNER);
    });

    it('소유자 TUTOR가 삭제하면 204를 반환한다', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/courses/${deletableCourseId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(204);
    });

    it('삭제된 강좌를 재조회하면 404를 반환한다', async () => {
      // findByIdAndVerifyOwner (used for update/delete) looks for any course
      // findById (used for GET detail) looks only for published ones
      // Either way, deleted course returns 404
      await request(app.getHttpServer())
        .patch(`/api/v1/courses/${deletableCourseId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'Ghost' })
        .expect(404);
    });
  });

  // --- POST /courses/:id/lectures ---

  describe('POST /api/v1/courses/:id/lectures', () => {
    it('소유자 TUTOR가 강의를 생성하면 201을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/lectures`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Lecture 1: Introduction',
          content: 'Welcome to the course!',
          order: 1,
        })
        .expect(201);

      const body = res.body as SuccessBody<LectureData>;
      expect(body.data.title).toBe('Lecture 1: Introduction');
      expect(body.data.content).toBe('Welcome to the course!');
      expect(body.data.order).toBe(1);
      expect(body.data.courseId).toBe(courseId);
      expect(body.data.videoUrl).toBeNull();
      lectureId = body.data.id;
    });

    it('같은 courseId에 중복 order로 생성하면 409를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/lectures`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Duplicate Order Lecture',
          content: 'Should conflict',
          order: 1,
        })
        .expect(409);

      const body = res.body as ErrorBody;
      expect(body.message).toContain('order');
    });

    it('동일 order 생성 요청을 동시에 보내면 1건만 생성되고 나머지는 409다', async () => {
      const lectureOrder = 999;
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/courses/${courseId}/lectures`)
          .set('Authorization', `Bearer ${tutorToken}`)
          .send({
            title: 'Concurrency Lecture A',
            content: 'Race condition test',
            order: lectureOrder,
          }),
        request(app.getHttpServer())
          .post(`/api/v1/courses/${courseId}/lectures`)
          .set('Authorization', `Bearer ${tutorToken}`)
          .send({
            title: 'Concurrency Lecture B',
            content: 'Race condition test',
            order: lectureOrder,
          }),
      ]);

      const statuses = [r1.status, r2.status].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409]);
      await assertLectureCountByCourseAndOrder(
        dataSource,
        courseId,
        lectureOrder,
        1,
      );
    });

    it('다른 TUTOR가 강의를 생성하면 403을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/lectures`)
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .send({
          title: 'Unauthorized Lecture',
          content: 'Should fail',
          order: 2,
        })
        .expect(403);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.NOT_COURSE_OWNER);
    });
  });

  // --- PATCH /courses/:id/lectures/:lid ---

  describe('PATCH /api/v1/courses/:id/lectures/:lid', () => {
    it('소유자 TUTOR가 강의를 수정하면 200을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}/lectures/${lectureId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'Lecture 1: Introduction (Updated)' })
        .expect(200);

      const body = res.body as SuccessBody<LectureData>;
      expect(body.data.title).toBe('Lecture 1: Introduction (Updated)');
      expect(body.data.id).toBe(lectureId);
    });

    it('존재하지 않는 lectureId를 수정하면 404를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/api/v1/courses/${courseId}/lectures/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ title: 'Ghost Lecture' })
        .expect(404);

      const body = res.body as ErrorBody;
      expect(body.message).toBe(ERROR_MESSAGES.LECTURE_NOT_FOUND);
    });
  });

  // --- DELETE /courses/:id/lectures/:lid ---

  describe('DELETE /api/v1/courses/:id/lectures/:lid', () => {
    it('소유자 TUTOR가 강의를 삭제하면 204를 반환한다', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/courses/${courseId}/lectures/${lectureId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(204);
    });

    it('삭제 후 강좌 상세에서 해당 강의가 포함되지 않는다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseId}`)
        .expect(200);

      const body = res.body as SuccessBody<CourseData>;
      const deletedLecture = body.data.lectures?.find(
        (l) => l.id === lectureId,
      );
      expect(deletedLecture).toBeUndefined();
    });
  });
});
