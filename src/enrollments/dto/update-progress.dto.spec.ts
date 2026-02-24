import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProgressDto } from './update-progress.dto.js';

describe('UpdateProgressDto', () => {
  it('should pass with valid progress value', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 50 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with progress = 0', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with progress = 100', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 100 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail without progress', async () => {
    const dto = plainToInstance(UpdateProgressDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative progress', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with progress > 100', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer progress', async () => {
    const dto = plainToInstance(UpdateProgressDto, { progress: 50.5 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
