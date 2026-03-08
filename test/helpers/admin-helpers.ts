import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AuthTokens } from './test-interfaces';
import { expectSuccessEnvelope } from './assert-response';
import { getUserIdByEmail } from './db-assertions';
import { promoteToAdmin, promoteToTutor } from './seed-helpers';

export interface AuthenticatedTestUser {
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface CreateUserOptions {
  label: string;
  password?: string;
}

interface CreateCourseOptions {
  title?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  isPublished?: boolean;
}

interface CreateAssignmentOptions {
  title?: string;
  description?: string;
  dueDate?: string;
}

interface CreateSubmissionOptions {
  content?: string;
  fileUrls?: string[];
  idempotencyKey?: string;
}

function buildUserProfile(label: string, password = 'password123') {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const safeLabel = label.toLowerCase().replace(/\s+/g, '-');
  return {
    email: `${safeLabel}-${nonce}@test.com`,
    password,
    name: `${label} ${nonce}`,
  };
}

export async function createStudentAndLogin(
  app: INestApplication<App>,
  options: CreateUserOptions,
): Promise<AuthenticatedTestUser> {
  const profile = buildUserProfile(options.label, options.password);

  await request(app.getHttpServer()).post('/api/v1/auth/register').send({
    email: profile.email,
    password: profile.password,
    name: profile.name,
  });

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: profile.email, password: profile.password })
    .expect(200);
  const tokens = expectSuccessEnvelope<AuthTokens>(loginRes, 200).data;
  const meRes = await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .expect(200);
  const userId = (meRes.body as { data: { id: string } }).data.id;

  return {
    ...profile,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId,
  };
}

export async function createTutorAndLogin(
  app: INestApplication<App>,
  dataSource: DataSource,
  options: CreateUserOptions,
): Promise<AuthenticatedTestUser> {
  const user = await createStudentAndLogin(app, options);
  await promoteToTutor(dataSource, user.email);

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  const tokens = expectSuccessEnvelope<AuthTokens>(loginRes, 200).data;

  return {
    ...user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: await getUserIdByEmail(dataSource, user.email),
  };
}

export async function createAdminAndLogin(
  app: INestApplication<App>,
  dataSource: DataSource,
  options: CreateUserOptions,
): Promise<AuthenticatedTestUser> {
  const user = await createStudentAndLogin(app, options);
  await promoteToAdmin(dataSource, user.email);

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/admin/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  const tokens = expectSuccessEnvelope<AuthTokens>(loginRes, 200).data;

  return {
    ...user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: await getUserIdByEmail(dataSource, user.email),
  };
}

export async function createCourse(
  app: INestApplication<App>,
  tutorToken: string,
  options: CreateCourseOptions = {},
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${tutorToken}`)
    .send({
      title: options.title ?? `Course ${Date.now()}`,
      description: options.description ?? 'E2E course',
      category: options.category ?? 'programming',
      difficulty: options.difficulty ?? 'beginner',
    })
    .expect(201);

  const courseId = (res.body as { data: { id: string } }).data.id;

  if (options.isPublished !== false) {
    await request(app.getHttpServer())
      .patch(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ isPublished: true })
      .expect(200);
  }

  return courseId;
}

export async function createAssignment(
  app: INestApplication<App>,
  tutorToken: string,
  courseId: string,
  options: CreateAssignmentOptions = {},
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/courses/${courseId}/assignments`)
    .set('Authorization', `Bearer ${tutorToken}`)
    .send({
      title: options.title ?? `Assignment ${Date.now()}`,
      description: options.description ?? 'E2E assignment',
      dueDate: options.dueDate,
    })
    .expect(201);

  return (res.body as { data: { id: string } }).data.id;
}

export async function enrollStudent(
  app: INestApplication<App>,
  studentToken: string,
  courseId: string,
  idempotencyKey?: string,
): Promise<string> {
  const req = request(app.getHttpServer())
    .post('/api/v1/enrollments')
    .set('Authorization', `Bearer ${studentToken}`);

  if (idempotencyKey) {
    req.set('Idempotency-Key', idempotencyKey);
  }

  const res = await req.send({ courseId }).expect(201);
  return (res.body as { data: { id: string } }).data.id;
}

export async function createSubmission(
  app: INestApplication<App>,
  studentToken: string,
  assignmentId: string,
  options: CreateSubmissionOptions = {},
): Promise<string> {
  const req = request(app.getHttpServer())
    .post(`/api/v1/assignments/${assignmentId}/submissions`)
    .set('Authorization', `Bearer ${studentToken}`);

  if (options.idempotencyKey) {
    req.set('Idempotency-Key', options.idempotencyKey);
  }

  const res = await req
    .send({
      content: options.content ?? 'E2E submission content',
      fileUrls: options.fileUrls ?? [],
    })
    .expect(201);

  return (res.body as { data: { id: string } }).data.id;
}
