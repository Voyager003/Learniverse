import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateAssignmentDto } from './update-assignment.dto.js';

describe('UpdateAssignmentDto', () => {
  it('빈 입력으로 검증을 통과해야 한다 (모든 필드 선택적)', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('title만으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, { title: 'Updated' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('description만으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, {
      description: 'Updated desc',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('dueDate만으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, {
      dueDate: '2026-04-01T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('빈 title로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateAssignmentDto, { title: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
