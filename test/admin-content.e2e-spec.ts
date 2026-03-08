import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  teardownTestApp,
  TestContext,
} from './helpers/create-app';
import {
  createAdminAndLogin,
  createAssignment,
  createCourse,
  createStudentAndLogin,
  createSubmission,
  createTutorAndLogin,
  enrollStudent,
} from './helpers/admin-helpers';
import {
  assertAdminAuditLogExists,
  assertAssignmentModerationState,
  assertCourseModerationState,
  assertSubmissionModerationState,
} from './helpers/db-assertions';
import {
  expectErrorEnvelope,
  expectSuccessEnvelope,
} from './helpers/assert-response';
import { PaginatedData } from './helpers/test-interfaces';

interface CourseData {
  id: string;
}

interface AssignmentData {
  id: string;
}

interface SubmissionData {
  id: string;
}

describe('Admin Content (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: TestContext;
  let dataSource: DataSource;
  let mongoConnection: Connection;
  let adminToken: string;
  let tutorToken: string;
  let studentToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app as INestApplication<App>;
    dataSource = ctx.dataSource;
    mongoConnection = ctx.mongoConnection;

    const admin = await createAdminAndLogin(app, dataSource, {
      label: 'Admin Content Root',
    });
    const tutor = await createTutorAndLogin(app, dataSource, {
      label: 'Admin Content Tutor',
    });
    const student = await createStudentAndLogin(app, {
      label: 'Admin Content Student',
    });

    adminToken = admin.accessToken;
    tutorToken = tutor.accessToken;
    studentToken = student.accessToken;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it('강좌 moderation이 공개 강좌 목록/상세에 반영된다', async () => {
    const courseId = await createCourse(app, tutorToken, {
      title: 'Moderated Course',
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/courses/${courseId}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isHidden: true, reason: 'policy' })
      .expect(200);

    await assertCourseModerationState(dataSource, courseId, true);
    await assertAdminAuditLogExists(
      dataSource,
      'courses.update_moderation',
      'course',
      courseId,
    );

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/courses/${courseId}`)
      .expect(404);
    expectErrorEnvelope(detailRes, 404);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .expect(200);
    const body = expectSuccessEnvelope<PaginatedData<CourseData>>(listRes, 200);
    expect(body.data.data.some((course) => course.id === courseId)).toBe(false);
  });

  it('과제 moderation이 학생 과제 조회에 반영된다', async () => {
    const courseId = await createCourse(app, tutorToken, {
      title: 'Assignment Moderation Course',
    });
    await enrollStudent(app, studentToken, courseId);
    const assignmentId = await createAssignment(app, tutorToken, courseId, {
      title: 'Moderated Assignment',
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/assignments/${assignmentId}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isHidden: true, reason: 'policy' })
      .expect(200);

    await assertAssignmentModerationState(dataSource, assignmentId, true);
    await assertAdminAuditLogExists(
      dataSource,
      'assignments.update_moderation',
      'assignment',
      assignmentId,
    );

    const assignmentsRes = await request(app.getHttpServer())
      .get(`/api/v1/courses/${courseId}/assignments`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const body = expectSuccessEnvelope<AssignmentData[]>(assignmentsRes, 200);
    expect(body.data.some((assignment) => assignment.id === assignmentId)).toBe(
      false,
    );
  });

  it('제출 moderation이 학생/튜터 제출 조회에서 제외된다', async () => {
    const courseId = await createCourse(app, tutorToken, {
      title: 'Submission Moderation Course',
    });
    await enrollStudent(app, studentToken, courseId);
    const assignmentId = await createAssignment(app, tutorToken, courseId, {
      title: 'Submission Assignment',
    });
    const submissionId = await createSubmission(
      app,
      studentToken,
      assignmentId,
      {
        content: 'submission to hide',
      },
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/submissions/${submissionId}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isHidden: true, reason: 'policy' })
      .expect(200);

    await assertSubmissionModerationState(mongoConnection, submissionId, true);
    await assertAdminAuditLogExists(
      dataSource,
      'submissions.update_moderation',
      'submission',
      submissionId,
    );

    const studentRes = await request(app.getHttpServer())
      .get(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const studentBody = expectSuccessEnvelope<SubmissionData[]>(
      studentRes,
      200,
    );
    expect(
      studentBody.data.some((submission) => submission.id === submissionId),
    ).toBe(false);

    const tutorRes = await request(app.getHttpServer())
      .get(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);
    const tutorBody = expectSuccessEnvelope<SubmissionData[]>(tutorRes, 200);
    expect(
      tutorBody.data.some((submission) => submission.id === submissionId),
    ).toBe(false);
  });
});
