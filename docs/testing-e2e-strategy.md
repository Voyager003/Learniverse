# E2E Testing Strategy

## Goals

- Cover business-critical flows first.
- Keep the test pyramid balanced:
  - Unit: most business branches and policy logic
  - Integration: framework-level behavior (filters/interceptors/guards)
  - E2E: end-to-end workflow confidence
- Validate not only HTTP status but also response envelope and persisted data.

## Current E2E Layers

- Health: `test/app.e2e-spec.ts`
- Auth lifecycle: `test/auth.e2e-spec.ts`
- Courses & lectures: `test/courses.e2e-spec.ts`
- Enrollments: `test/enrollments.e2e-spec.ts`
- Assignment submission workflow: `test/assignments-submissions.e2e-spec.ts`
- Users self-profile: `test/users.e2e-spec.ts`

## Shared Assertions

- Response envelope helper:
  - `test/helpers/assert-response.ts`
  - Success: `data`, `statusCode`
  - Error: `statusCode`, `message`, `error`, `timestamp`
- DB consistency helper:
  - `test/helpers/db-assertions.ts`
  - PostgreSQL and MongoDB assertions for critical write paths

## Critical Flow Priority

1. Register/Login/Refresh/Logout
2. Tutor creates and publishes course
3. Student enrolls course
4. Tutor creates assignment
5. Student submits assignment
6. Tutor gives feedback

## Concurrency / Duplicate Request Policy

- Enrollment duplicate requests: only one enrollment row should be created.
- Submission duplicate requests: only one submission document should be created.
- Lecture duplicate order requests: only one lecture should be created for same `(course_id, order)`.

## CI Execution Policy

- PR: `npm run test:e2e:smoke`
- Nightly: `npm run test:e2e:full`

This keeps PR feedback fast while preserving full-suite confidence daily.
