import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAssignmentDto } from './create-assignment.dto.js';

describe('CreateAssignmentDto', () => {
  const validInput = {
    title: 'NestJS Guard 구현',
    description: 'JwtAuthGuard를 직접 구현해보세요.',
  };

  it('유효한 입력으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateAssignmentDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('dueDate가 포함된 입력으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateAssignmentDto, {
      ...validInput,
      dueDate: '2026-03-01T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('dueDate 없이도 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateAssignmentDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('title 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateAssignmentDto, {
      description: 'desc',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('description 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateAssignmentDto, {
      title: 'title',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('빈 title로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateAssignmentDto, {
      ...validInput,
      title: '',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
