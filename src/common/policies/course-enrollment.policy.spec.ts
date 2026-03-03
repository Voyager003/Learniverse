import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from '../../enrollments/enrollments.service.js';
import { CourseEnrollmentPolicy } from './course-enrollment.policy.js';

describe('CourseEnrollmentPolicy', () => {
  let policy: CourseEnrollmentPolicy;
  let enrollmentsService: Partial<Record<keyof EnrollmentsService, jest.Mock>>;

  beforeEach(async () => {
    enrollmentsService = {
      isEnrolled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseEnrollmentPolicy,
        {
          provide: EnrollmentsService,
          useValue: enrollmentsService,
        },
      ],
    }).compile();

    policy = module.get<CourseEnrollmentPolicy>(CourseEnrollmentPolicy);
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
});
