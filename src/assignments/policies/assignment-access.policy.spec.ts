import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentAccessPolicy } from './assignment-access.policy.js';
import { EnrollmentsService } from '../../enrollments/enrollments.service.js';
import { Role } from '../../common/enums/index.js';

describe('AssignmentAccessPolicy', () => {
  let policy: AssignmentAccessPolicy;
  let enrollmentsService: Partial<Record<keyof EnrollmentsService, jest.Mock>>;

  beforeEach(async () => {
    enrollmentsService = {
      isEnrolled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentAccessPolicy,
        {
          provide: EnrollmentsService,
          useValue: enrollmentsService,
        },
      ],
    }).compile();

    policy = module.get<AssignmentAccessPolicy>(AssignmentAccessPolicy);
  });

  describe('assertTutorOwnsCourse', () => {
    it('튜터가 강좌 소유자면 예외 없이 통과해야 한다', () => {
      expect(() =>
        policy.assertTutorOwnsCourse({ tutorId: 'tutor-1' }, 'tutor-1'),
      ).not.toThrow();
    });

    it('튜터가 강좌 소유자가 아니면 ForbiddenException을 던져야 한다', () => {
      expect(() =>
        policy.assertTutorOwnsCourse({ tutorId: 'tutor-2' }, 'tutor-1'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertCanReadCourseAssignments', () => {
    it('소유 튜터는 조회할 수 있어야 한다', async () => {
      await expect(
        policy.assertCanReadCourseAssignments(
          { id: 'course-1', tutorId: 'tutor-1' },
          'tutor-1',
          Role.TUTOR,
        ),
      ).resolves.toBeUndefined();
    });

    it('비소유 튜터는 ForbiddenException을 던져야 한다', async () => {
      await expect(
        policy.assertCanReadCourseAssignments(
          { id: 'course-1', tutorId: 'tutor-2' },
          'tutor-1',
          Role.TUTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('수강 중인 학생은 조회할 수 있어야 한다', async () => {
      enrollmentsService.isEnrolled!.mockResolvedValue(true);

      await expect(
        policy.assertCanReadCourseAssignments(
          { id: 'course-1', tutorId: 'tutor-1' },
          'student-1',
          Role.STUDENT,
        ),
      ).resolves.toBeUndefined();

      expect(enrollmentsService.isEnrolled).toHaveBeenCalledWith(
        'student-1',
        'course-1',
      );
    });

    it('미수강 학생은 ForbiddenException을 던져야 한다', async () => {
      enrollmentsService.isEnrolled!.mockResolvedValue(false);

      await expect(
        policy.assertCanReadCourseAssignments(
          { id: 'course-1', tutorId: 'tutor-1' },
          'student-1',
          Role.STUDENT,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
