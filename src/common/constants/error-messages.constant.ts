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

  // Assignments
  ASSIGNMENT_NOT_FOUND: 'Assignment not found',

  // Submissions
  SUBMISSION_NOT_FOUND: 'Submission not found',
  NOT_ENROLLED_IN_COURSE: 'You are not enrolled in this course',
} as const;
