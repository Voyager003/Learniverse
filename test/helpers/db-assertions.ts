import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import { EnrollmentStatus, Role } from '../../src/common/enums';

type SubmissionExpectation = {
  status?: string;
  feedback?: string | null;
  score?: number | null;
  reviewedAt?: 'null' | 'not-null';
};

export async function getUserIdByEmail(
  dataSource: DataSource,
  email: string,
): Promise<string> {
  const rows: Array<{ id: string }> = await dataSource.query(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );

  expect(rows).toHaveLength(1);
  return rows[0].id;
}

export async function assertUserRoleByEmail(
  dataSource: DataSource,
  email: string,
  role: Role,
): Promise<void> {
  const rows: Array<{ role: Role }> = await dataSource.query(
    'SELECT role FROM users WHERE email = $1',
    [email],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].role).toBe(role);
}

export async function assertUserNameByEmail(
  dataSource: DataSource,
  email: string,
  name: string,
): Promise<void> {
  const rows: Array<{ name: string }> = await dataSource.query(
    'SELECT name FROM users WHERE email = $1',
    [email],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe(name);
}

export async function assertRefreshTokenStateByEmail(
  dataSource: DataSource,
  email: string,
  shouldExist: boolean,
): Promise<void> {
  const rows: Array<{ refresh_token: string | null }> = await dataSource.query(
    'SELECT refresh_token FROM users WHERE email = $1',
    [email],
  );

  expect(rows).toHaveLength(1);
  if (shouldExist) {
    expect(rows[0].refresh_token).not.toBeNull();
    expect(rows[0].refresh_token).not.toBe('');
    return;
  }

  expect(rows[0].refresh_token).toBeNull();
}

export async function assertUserActiveStateByEmail(
  dataSource: DataSource,
  email: string,
  expectedActive: boolean,
): Promise<void> {
  const rows: Array<{ is_active: boolean }> = await dataSource.query(
    'SELECT is_active FROM users WHERE email = $1',
    [email],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].is_active).toBe(expectedActive);
}

export async function assertCoursePublishedState(
  dataSource: DataSource,
  courseId: string,
  expectedPublished: boolean,
): Promise<void> {
  const rows: Array<{ is_published: boolean }> = await dataSource.query(
    'SELECT is_published FROM courses WHERE id = $1',
    [courseId],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].is_published).toBe(expectedPublished);
}

export async function assertCourseModerationState(
  dataSource: DataSource,
  courseId: string,
  expectedHidden: boolean,
): Promise<void> {
  const rows: Array<{ is_admin_hidden: boolean }> = await dataSource.query(
    'SELECT is_admin_hidden FROM courses WHERE id = $1',
    [courseId],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].is_admin_hidden).toBe(expectedHidden);
}

export async function assertAssignmentModerationState(
  dataSource: DataSource,
  assignmentId: string,
  expectedHidden: boolean,
): Promise<void> {
  const rows: Array<{ is_admin_hidden: boolean }> = await dataSource.query(
    'SELECT is_admin_hidden FROM assignments WHERE id = $1',
    [assignmentId],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].is_admin_hidden).toBe(expectedHidden);
}

export async function assertEnrollmentState(
  dataSource: DataSource,
  studentId: string,
  courseId: string,
  expectedStatus: EnrollmentStatus,
  expectedProgress: number,
): Promise<void> {
  const rows: Array<{ status: EnrollmentStatus; progress: number }> =
    await dataSource.query(
      'SELECT status, progress FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId],
    );

  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe(expectedStatus);
  expect(rows[0].progress).toBe(expectedProgress);
}

export async function assertEnrollmentCount(
  dataSource: DataSource,
  studentId: string,
  courseId: string,
  expectedCount: number,
): Promise<void> {
  const rows: Array<{ count: number }> = await dataSource.query(
    'SELECT COUNT(*)::int AS count FROM enrollments WHERE student_id = $1 AND course_id = $2',
    [studentId, courseId],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].count).toBe(expectedCount);
}

export async function assertLectureCountByCourseAndOrder(
  dataSource: DataSource,
  courseId: string,
  lectureOrder: number,
  expectedCount: number,
): Promise<void> {
  const rows: Array<{ count: number }> = await dataSource.query(
    'SELECT COUNT(*)::int AS count FROM lectures WHERE course_id = $1 AND "order" = $2',
    [courseId, lectureOrder],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].count).toBe(expectedCount);
}

export async function assertSubmissionCount(
  mongoConnection: Connection,
  assignmentId: string,
  studentId: string,
  expectedCount: number,
): Promise<void> {
  const count = await mongoConnection.collection('submissions').countDocuments({
    assignmentId,
    studentId,
  });
  expect(count).toBe(expectedCount);
}

export async function assertSubmissionState(
  mongoConnection: Connection,
  assignmentId: string,
  studentId: string,
  expected: SubmissionExpectation,
): Promise<void> {
  const submission = (await mongoConnection.collection('submissions').findOne({
    assignmentId,
    studentId,
  })) as Record<string, unknown> | null;

  expect(submission).not.toBeNull();
  if (!submission) {
    return;
  }

  if (expected.status !== undefined) {
    expect(submission.status).toBe(expected.status);
  }

  if (expected.feedback !== undefined) {
    expect(submission.feedback).toBe(expected.feedback);
  }

  if (expected.score !== undefined) {
    expect(submission.score).toBe(expected.score);
  }

  if (expected.reviewedAt === 'null') {
    expect(submission.reviewedAt ?? null).toBeNull();
  }

  if (expected.reviewedAt === 'not-null') {
    expect(submission.reviewedAt).not.toBeNull();
  }
}

export async function assertSubmissionModerationState(
  mongoConnection: Connection,
  submissionId: string,
  expectedHidden: boolean,
): Promise<void> {
  const submission = (await mongoConnection.collection('submissions').findOne({
    _id: new mongoConnection.base.Types.ObjectId(submissionId),
  })) as Record<string, unknown> | null;

  expect(submission).not.toBeNull();
  if (!submission) {
    return;
  }

  expect(submission.isAdminHidden).toBe(expectedHidden);
}

export async function assertAdminAuditLogExists(
  dataSource: DataSource,
  action: string,
  resourceType: string,
  resourceId?: string,
): Promise<void> {
  const rows: Array<{ count: number }> = await dataSource.query(
    `SELECT COUNT(*)::int AS count
     FROM admin_audit_logs
     WHERE action = $1
       AND resource_type = $2
       AND ($3::varchar IS NULL OR resource_id = $3)`,
    [action, resourceType, resourceId ?? null],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].count).toBeGreaterThan(0);
}

export async function assertIdempotencyKeyCount(
  dataSource: DataSource,
  userId: string,
  path: string,
  expectedCount: number,
): Promise<void> {
  const rows: Array<{ count: number }> = await dataSource.query(
    'SELECT COUNT(*)::int AS count FROM idempotency_keys WHERE user_id = $1 AND path = $2',
    [userId, path],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].count).toBe(expectedCount);
}
