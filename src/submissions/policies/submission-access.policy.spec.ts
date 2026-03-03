import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionAccessPolicy } from './submission-access.policy.js';
import { EnrollmentsService } from '../../enrollments/enrollments.service.js';
import { Role } from '../../common/enums/index.js';
import { CourseEnrollmentPolicy } from '../../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../../common/policies/course-ownership.policy.js';

describe('SubmissionAccessPolicy', () => {
  let policy: SubmissionAccessPolicy;
  let enrollmentsService: Partial<Record<keyof EnrollmentsService, jest.Mock>>;

  beforeEach(async () => {
    enrollmentsService = {
      isEnrolled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionAccessPolicy,
        CourseEnrollmentPolicy,
        CourseOwnershipPolicy,
        {
          provide: EnrollmentsService,
          useValue: enrollmentsService,
        },
      ],
    }).compile();

    policy = module.get<SubmissionAccessPolicy>(SubmissionAccessPolicy);
  });

  describe('assertTutorOwnsCourse', () => {
    it('강좌 소유 튜터면 예외 없이 통과해야 한다', () => {
      expect(() =>
        policy.assertTutorOwnsCourse('tutor-1', 'tutor-1'),
      ).not.toThrow();
    });

    it('강좌 소유 튜터가 아니면 ForbiddenException을 던져야 한다', () => {
      expect(() => policy.assertTutorOwnsCourse('tutor-2', 'tutor-1')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertStudentEnrolled', () => {
    it('수강 중인 학생이면 예외 없이 통과해야 한다', async () => {
      enrollmentsService.isEnrolled!.mockResolvedValue(true);

      await expect(
        policy.assertStudentEnrolled('student-1', 'course-1'),
      ).resolves.toBeUndefined();
    });

    it('미수강 학생이면 ForbiddenException을 던져야 한다', async () => {
      enrollmentsService.isEnrolled!.mockResolvedValue(false);

      await expect(
        policy.assertStudentEnrolled('student-1', 'course-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('buildSubmissionFilter', () => {
    it('튜터는 assignmentId 기준 필터를 반환해야 한다', async () => {
      await expect(
        policy.buildSubmissionFilter({
          assignmentId: 'assignment-1',
          courseId: 'course-1',
          courseTutorId: 'tutor-1',
          userId: 'tutor-1',
          role: Role.TUTOR,
        }),
      ).resolves.toEqual({ assignmentId: 'assignment-1' });
    });

    it('학생은 본인 studentId가 포함된 필터를 반환해야 한다', async () => {
      enrollmentsService.isEnrolled!.mockResolvedValue(true);

      await expect(
        policy.buildSubmissionFilter({
          assignmentId: 'assignment-1',
          courseId: 'course-1',
          courseTutorId: 'tutor-1',
          userId: 'student-1',
          role: Role.STUDENT,
        }),
      ).resolves.toEqual({
        assignmentId: 'assignment-1',
        studentId: 'student-1',
      });
    });

    it('소유자가 아닌 튜터는 ForbiddenException을 던져야 한다', async () => {
      await expect(
        policy.buildSubmissionFilter({
          assignmentId: 'assignment-1',
          courseId: 'course-1',
          courseTutorId: 'tutor-2',
          userId: 'tutor-1',
          role: Role.TUTOR,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('미수강 학생은 ForbiddenException을 던져야 한다', async () => {
      enrollmentsService.isEnrolled!.mockResolvedValue(false);

      await expect(
        policy.buildSubmissionFilter({
          assignmentId: 'assignment-1',
          courseId: 'course-1',
          courseTutorId: 'tutor-1',
          userId: 'student-1',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
