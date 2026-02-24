import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProgressDto } from './update-progress.dto.js';

describe('UpdateProgressDto', () => {
  it('유효한 progress 값으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 50 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('progress가 0일 때 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('progress가 100일 때 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 100 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('progress 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateProgressDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('음수 progress로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('progress가 100을 초과하면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('정수가 아닌 progress로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 50.5 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
