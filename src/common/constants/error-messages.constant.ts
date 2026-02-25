export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  UNAUTHORIZED: 'Unauthorized access',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',

  // Users
  USER_NOT_FOUND: 'User not found',

  // Courses
  COURSE_NOT_FOUND: 'Course not found',
  NOT_COURSE_OWNER: 'You are not the owner of this course',

  // Lectures
  LECTURE_NOT_FOUND: 'Lecture not found',

  // Enrollments
  ENROLLMENT_NOT_FOUND: 'Enrollment not found',
  ALREADY_ENROLLED: 'Already enrolled in this course',
  NOT_ENROLLMENT_OWNER: 'You are not the owner of this enrollment',
  ENROLLMENT_NOT_ACTIVE: 'Cannot update progress on a non-active enrollment',
  CANNOT_ENROLL_OWN_COURSE: 'Cannot enroll in your own course',

  // Assignments
  ASSIGNMENT_NOT_FOUND: 'Assignment not found',
  DUE_DATE_IN_PAST: 'Due date must be in the future',

  // Submissions
  SUBMISSION_NOT_FOUND: 'Submission not found',
  NOT_ENROLLED_IN_COURSE: 'You are not enrolled in this course',
  ALREADY_SUBMITTED: 'Already submitted this assignment',
  SUBMISSION_DEADLINE_PASSED: 'Submission deadline has passed',
  SUBMISSION_ALREADY_REVIEWED:
    'Cannot modify feedback on a reviewed submission',
  SUBMISSION_ASSIGNMENT_MISMATCH:
    'Submission does not belong to this assignment',

  // Common
  INVALID_MONGO_ID: 'Invalid ID format',
} as const;
