# Learniverse

온라인 교육 플랫폼 백엔드 API 서버

## 프로젝트 목적

온라인 교육 플랫폼의 핵심 백엔드를 구축합니다.
강의 등록부터 수강 신청, 과제 제출, 피드백까지 교육의 전체 사이클을 다루며,
수강생이 몰리는 상황에서도 안정적으로 동작하는 서버를 목표로 합니다.

## 기술 스택

| 항목 | 기술 |
|---|---|
| Framework | NestJS 11 + TypeScript 5.7 |
| PostgreSQL | TypeORM (관계형 데이터) |
| MongoDB | Mongoose (유연한 문서 구조) |
| 인증 | Passport + JWT (Access 15m / Refresh 7d) |
| 입력 검증 | class-validator + class-transformer |
| 설정 관리 | @nestjs/config + Joi |
| API 문서 | Swagger |
| 테스트 | Jest 30 + Supertest + Testcontainers |

## 구현 기능

### 인증
- [x] 회원가입 / 로그인
- [x] JWT Access + Refresh Token
- [x] 역할 기반 접근 제어 (Student, Tutor, Admin)

### 사용자
- [x] 프로필 조회 / 수정
- [x] 사용자 목록 (Admin)

### 강의
- [x] 강의 CRUD (Tutor)
- [x] 레슨 CRUD (강의 하위 리소스)
- [x] 강의 목록 조회 + 페이지네이션 (Public)

### 수강 신청
- [x] 수강 신청 (중복 방지)
- [x] 내 수강 목록 조회
- [x] 진도 업데이트

### 과제
- [x] 과제 출제 (Tutor)
- [x] 과제 제출 (Student, MongoDB)
- [x] 피드백 작성 (Tutor)

### 인프라
- [x] PostgreSQL Connection Pooling
- [x] 글로벌 예외 필터 (일관된 에러 응답)
- [x] 응답 래핑 인터셉터
- [x] 환경변수 검증 (Joi)
- [x] Swagger API 문서 자동화 (전 라우트)
- [x] DB 인덱스 최적화 (assignments, submissions)
- [x] E2E 테스트 (Testcontainers — PostgreSQL 16, MongoDB 7)

## API 엔드포인트

모든 라우트 prefix: `/api/v1`

### Auth
| Method | Endpoint | 설명 | 권한 |
|---|---|---|---|
| POST | /auth/register | 회원가입 | Public |
| POST | /auth/login | 로그인 | Public |
| POST | /auth/refresh | 토큰 갱신 | Public |
| POST | /auth/logout | 로그아웃 | Authenticated |

### Users
| Method | Endpoint | 설명 | 권한 |
|---|---|---|---|
| GET | /users/me | 내 프로필 | Authenticated |
| PATCH | /users/me | 프로필 수정 | Authenticated |
| GET | /users | 사용자 목록 | Admin |

### Courses
| Method | Endpoint | 설명 | 권한 |
|---|---|---|---|
| POST | /courses | 강의 생성 | Tutor, Admin |
| GET | /courses | 강의 목록 | Public |
| GET | /courses/:id | 강의 상세 | Public |
| PATCH | /courses/:id | 강의 수정 | Owner Tutor |
| DELETE | /courses/:id | 강의 삭제 | Owner Tutor |
| POST | /courses/:id/lectures | 레슨 추가 | Owner Tutor |
| PATCH | /courses/:id/lectures/:lid | 레슨 수정 | Owner Tutor |
| DELETE | /courses/:id/lectures/:lid | 레슨 삭제 | Owner Tutor |

### Enrollments
| Method | Endpoint | 설명 | 권한 |
|---|---|---|---|
| POST | /enrollments | 수강 신청 | Student |
| GET | /enrollments/my | 내 수강 목록 | Student |
| PATCH | /enrollments/:id/progress | 진도 업데이트 | Student (본인) |

### Assignments & Submissions
| Method | Endpoint | 설명 | 권한 |
|---|---|---|---|
| POST | /courses/:cid/assignments | 과제 출제 | Owner Tutor |
| GET | /courses/:cid/assignments | 과제 목록 | Enrolled Student, Tutor |
| POST | /assignments/:aid/submissions | 과제 제출 | Enrolled Student |
| GET | /assignments/:aid/submissions | 제출물 목록 | Tutor(전체), Student(본인) |
| POST | /assignments/:aid/submissions/:sid/feedback | 피드백 작성 | Owner Tutor |

## DB 설계

### PostgreSQL
- **users** — 사용자 (email, role, refresh_token)
- **courses** — 강의 (title, category, difficulty, tutor FK)
- **lectures** — 레슨 (course FK, order UNIQUE per course, content)
- **enrollments** — 수강 (student + course UNIQUE, status, progress)
- **assignments** — 과제 (course FK, due_date)

### MongoDB
- **submissions** — 제출물 (studentId, assignmentId, content, fileUrls, status, feedback, score)

## 설치 및 실행

```bash
# 설치
npm install

# 환경변수 설정
cp .env.example .env

# 개발 서버
npm run start:dev

# 테스트
npm run test

# Swagger 문서
# http://localhost:3000/docs
```
