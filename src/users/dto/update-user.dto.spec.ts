import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto.js';

describe('UpdateUserDto', () => {
  it('유효한 이름으로 검증을 통과해야 한다', async () => {
    const dto = new UpdateUserDto();
    dto.name = 'Updated Name';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('이름 생략 시 검증을 통과해야 한다 (모든 필드 선택적)', async () => {
    const dto = new UpdateUserDto();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('이름이 너무 짧으면 검증에 실패해야 한다', async () => {
    const dto = new UpdateUserDto();
    dto.name = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('이름이 최대 길이를 초과하면 검증에 실패해야 한다', async () => {
    const dto = new UpdateUserDto();
    dto.name = 'a'.repeat(51);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });
});
