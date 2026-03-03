import { ForbiddenException } from '@nestjs/common';
import { CourseOwnershipPolicy } from './course-ownership.policy.js';

describe('CourseOwnershipPolicy', () => {
  let policy: CourseOwnershipPolicy;

  beforeEach(() => {
    policy = new CourseOwnershipPolicy();
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
});
