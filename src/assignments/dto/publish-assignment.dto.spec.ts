import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublishAssignmentDto } from './publish-assignment.dto.js';

describe('PublishAssignmentDto', () => {
  it('isPublished가 boolean이면 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(PublishAssignmentDto, { isPublished: true });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('isPublished가 없으면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(PublishAssignmentDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('isPublished가 boolean이 아니면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(PublishAssignmentDto, { isPublished: 'true' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
