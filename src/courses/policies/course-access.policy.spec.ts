import { ForbiddenException } from '@nestjs/common';
import { CourseAccessPolicy } from './course-access.policy.js';

describe('CourseAccessPolicy', () => {
  let policy: CourseAccessPolicy;

  beforeEach(() => {
    policy = new CourseAccessPolicy();
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
