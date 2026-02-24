import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEnrollmentDto } from './create-enrollment.dto.js';

describe('CreateEnrollmentDto', () => {
  const validInput = {
    courseId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('유효한 UUID courseId로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('courseId 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('UUID가 아닌 courseId로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {
      courseId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('빈 문자열 courseId로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {
      courseId: '',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
