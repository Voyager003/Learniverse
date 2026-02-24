import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEnrollmentDto } from './create-enrollment.dto.js';

describe('CreateEnrollmentDto', () => {
  const validInput = {
    courseId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('should pass with valid UUID courseId', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail without courseId', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-UUID courseId', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {
      courseId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with empty string courseId', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {
      courseId: '',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
