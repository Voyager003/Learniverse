# Learniverse - Development Guidelines

## Project Overview

온라인 교육 플랫폼 백엔드. NestJS + TypeScript + PostgreSQL + MongoDB 기반.

## Tech Stack

- **Framework**: NestJS 11 + TypeScript 5.7
- **PostgreSQL ORM**: TypeORM
- **MongoDB ODM**: Mongoose
- **Auth**: Passport + JWT
- **Validation**: class-validator + class-transformer
- **Config**: @nestjs/config + Joi
- **Docs**: @nestjs/swagger
- **Test**: Jest 30 + Supertest

## Development Workflow

### Phase 진행 프로세스

각 Phase는 세부 단계(Phase N-1, N-2, ...)로 나뉘며, 다음 절차를 따른다:

1. **계획**: Phase 시작 시 세부 단계별 작업 목록을 제시한다
2. **단계별 실행**: 각 세부 단계마다:
   - 코드를 작성한다
   - **사용자와 문답을 통해 함께 검증한다** (테스트 결과, 린트, 코드 리뷰)
   - 검증 통과 후 커밋한다
3. **대기**: 세부 단계가 끝나면 **반드시 사용자의 다음 진행 명령을 기다린다**
4. **절대 하지 않는다**: 사용자 명령 없이 다음 세부 단계로 자동 진행

```
Phase N-1 코드 작성 → 사용자와 검증 → 커밋 → [STOP] 사용자 명령 대기
                                                    ↓ "다음 진행해줘"
Phase N-2 코드 작성 → 사용자와 검증 → 커밋 → [STOP] 사용자 명령 대기
```

### TDD (Test-Driven Development)

**반드시 테스트를 먼저 작성한다.**

1. RED: 실패하는 테스트를 먼저 작성
2. GREEN: 테스트를 통과하는 최소한의 코드 작성
3. REFACTOR: 코드 정리 (테스트 통과 유지)

목표 커버리지: 80% 이상

## Commit Convention

### Commit 단위

- 코드 추가 시: 추가한 코드 + 해당 테스트 코드 = 하나의 커밋
- 코드 수정 시: 수정한 코드 + 영향받은 테스트 수정 = 하나의 커밋
- **테스트가 성공해야만 커밋한다** (`npm run test` 통과 필수)

### Commit Message

- **한글로 작성**
- 형식: `<타입>: <설명>`
- 타입: feat, fix, refactor, test, chore, docs
- 예시:
  - `feat: 사용자 엔티티 및 단위 테스트 추가`
  - `fix: JWT 토큰 만료 검증 로직 수정`
  - `refactor: 수강 서비스 중복 코드 제거`

## Architecture

### Module Structure

```
AppModule
├── ConfigModule (global)
├── DatabaseModule (TypeORM + Mongoose)
├── CommonModule (filters, interceptors, guards, decorators)
├── AuthModule
├── UsersModule
├── CoursesModule
├── EnrollmentsModule
├── AssignmentsModule
└── SubmissionsModule
```

### Directory Convention per Module

```
<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.controller.spec.ts
├── <module>.service.ts
├── <module>.service.spec.ts
├── entities/ or schemas/
│   └── <entity>.entity.ts or <schema>.schema.ts
└── dto/
    ├── create-<entity>.dto.ts
    └── update-<entity>.dto.ts
```

## Coding Standards

### Language

- Code comments: English
- Commit messages: Korean
- Variable/function names: English (camelCase)
- Class names: English (PascalCase)
- Database columns: snake_case

### SOLID Principles

- **S**: Each class has a single responsibility
- **O**: Use interfaces for extension, avoid modifying existing code
- **L**: Subtypes must be substitutable for their base types
- **I**: Prefer small, focused interfaces
- **D**: Depend on abstractions (inject via constructor)

### TypeScript Type Safety

`any` 타입은 **절대 사용하지 않는다** (ESLint `no-explicit-any: error`).

| 상황 | `any` 대신 사용할 타입 |
|---|---|
| 타입을 모를 때 | `unknown` (사용 전 타입 가드 필수) |
| 여러 타입 가능 | union 타입 (`string \| number`) |
| 객체 구조 유동적 | `Record<string, unknown>` |
| 외부 라이브러리 반환 | 인터페이스 직접 정의 |
| NestJS `getResponse()` 등 | 제네릭 명시 (`.getResponse<Response>()`) |
| 테스트 mock 객체 | 인터페이스 정의 + `as unknown as TargetType` |
| Joi validate 결과 | 결과 타입 인터페이스 정의 + 타입 단언 |

```typescript
// BAD
const data: any = getValue();
data.foo.bar();

// GOOD
const data: unknown = getValue();
if (isExpectedType(data)) {
  data.foo.bar();
}
```

### Rules

- DTO separates input/output; never expose entities directly in API responses
- Global exception filter ensures consistent error response format
- Use `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- All routes require authentication by default (`JwtAuthGuard` as APP_GUARD)
- Use `@Public()` to exempt specific routes
- Use `@Roles()` + `RolesGuard` for role-based authorization
- API prefix: `/api/v1`

## Phase Progress

### Phase 1 — 기반 설정 ✅
- ConfigModule (app, database, mongodb, jwt) + Joi 검증
- DatabaseModule (TypeORM + Mongoose, connection pooling)
- CommonModule (HttpExceptionFilter, TransformInterceptor, LoggingInterceptor)
- 공통 enum (Role, EnrollmentStatus, SubmissionStatus), ERROR_MESSAGES
- PaginationQueryDto, PaginatedResponseDto
- main.ts: /api/v1, ValidationPipe, CORS, Swagger
- 6 suites, 20 tests

### Phase 2 — Auth + Users ✅
- User 엔티티 (PostgreSQL)
- AuthModule: JWT + Passport (register, login, refresh, logout)
- Guards: JwtAuthGuard (APP_GUARD), RolesGuard + @Public(), @Roles()
- UsersModule: CRUD + DTOs
- 코드 리뷰 반영 (refresh 버그, 타입 안전성, 방어 코드)
- 19 suites, 81 tests

### Phase 3 — Courses + Lectures
> Showcase: SOLID 소유권 패턴, TypeORM 관계, 페이지네이션

- **3-1**: Course 엔티티 + 테스트
  - title, description, category, difficulty, is_published, tutor_id (ManyToOne → User)
- **3-2**: Lecture 엔티티 + 테스트
  - title, content, video_url, order, course_id (ManyToOne → Course)
  - Course에 @OneToMany 역참조 추가
- **3-3**: Course DTO (Create, Update, Response, Query)
  - CourseQueryDto extends PaginationQueryDto (category, difficulty 필터)
- **3-4**: Lecture DTO (Create, Update, Response)
- **3-5**: CoursesService + 테스트
  - CRUD + 소유권 검증 + 페이지네이션 (QueryBuilder)
  - Lecture CRUD (하위 리소스)
- **3-6**: CoursesController + 테스트
  - POST/GET/PATCH/DELETE /courses, POST/PATCH/DELETE /courses/:id/lectures
  - @Public (목록/상세), @Roles(TUTOR, ADMIN) (CUD)
- **3-7**: CoursesModule + AppModule 통합
- **3-8**: 코드 리뷰 + 수정

### Phase 4 — Enrollments
> Showcase: 비즈니스 무결성, Race condition 이중 방어, 크로스 모듈 DI

- **4-1**: Enrollment 엔티티 + 테스트
  - student_id (ManyToOne → User), course_id (ManyToOne → Course)
  - status (EnrollmentStatus), progress (0-100)
  - UNIQUE(student_id, course_id)
- **4-2**: Enrollment DTO (Create, UpdateProgress, Response)
- **4-3**: EnrollmentsService + 테스트
  - enroll (중복 방지 — 앱 + DB 레벨), findMyEnrollments, updateProgress
  - progress=100 → 자동 COMPLETED, isEnrolled() 헬퍼 (Phase 5에서 사용)
- **4-4**: EnrollmentsController + 테스트
  - POST /enrollments, GET /enrollments/my, PATCH /enrollments/:id/progress
- **4-5**: EnrollmentsModule + AppModule 통합
- **4-6**: 코드 리뷰 + 수정

### Phase 5 — Assignments + Submissions
> Showcase: Dual-DB (PostgreSQL + MongoDB), 복합 권한 검증, 피드백 워크플로우

- **5-1**: Assignment 엔티티 (PostgreSQL) + 테스트
  - title, description, course_id (ManyToOne → Course), due_date
- **5-2**: Submission 스키마 (MongoDB/Mongoose) + 테스트
  - studentId, assignmentId, content, fileUrls, status, feedback, score, reviewedAt
- **5-3**: Assignment + Submission DTO
- **5-4**: AssignmentsService + 테스트
  - create (Owner Tutor), findByCourse (수강생: 등록 확인, Tutor: 소유 확인)
- **5-5**: SubmissionsService + 테스트
  - submit (수강 확인), findByAssignment (역할별 필터), addFeedback (Tutor)
  - 상태 전환: SUBMITTED → REVIEWED/RETURNED
- **5-6**: AssignmentsController + 테스트
  - POST/GET /courses/:cid/assignments
- **5-7**: SubmissionsController + 테스트
  - POST/GET /assignments/:aid/submissions
  - POST /assignments/:aid/submissions/:sid/feedback
- **5-8**: Assignments + Submissions 모듈 통합
- **5-9**: 코드 리뷰 + 수정

### Phase 6 — Stability & Quality
> Showcase: "수강생이 몰려도 안정적" — E2E 테스트, Rate Limiting, 인덱스, Swagger

- **6-1**: DB 인덱스 최적화
  - courses(category, tutor_id), enrollments(student_id), assignments(course_id)
  - MongoDB: submissions(studentId+assignmentId, assignmentId)
- **6-2**: Rate Limiting (@nestjs/throttler)
  - 전역 60req/min, 인증 엔드포인트 5req/min
- **6-3**: Swagger API 문서 완성
  - 전 라우트 @ApiTags, @ApiOperation, @ApiResponse, @ApiBearerAuth
- **6-4**: E2E 테스트 셋업 + Auth 플로우
- **6-5**: Courses & Lectures E2E 테스트
- **6-6**: Enrollments E2E 테스트
- **6-7**: Assignments & Submissions E2E 테스트

## Commands

```bash
npm run start:dev    # Dev server (watch mode)
npm run test         # Unit tests
npm run test:watch   # Unit tests (watch)
npm run test:cov     # Coverage report
npm run test:e2e     # E2E tests
npm run build        # Production build
npm run lint         # ESLint check + fix
```

## Environment Variables

Required env vars (see .env.example):

```
# App
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=
DB_DATABASE=learniverse

# MongoDB
MONGODB_URI=mongodb://localhost:27017/learniverse

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d
```
