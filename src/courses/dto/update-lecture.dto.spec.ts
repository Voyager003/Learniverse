import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateLectureDto } from './update-lecture.dto.js';

describe('UpdateLectureDto', () => {
  it('should pass with empty input (all fields optional)', async () => {
    const dto = plainToInstance(UpdateLectureDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with partial update (title only)', async () => {
    const dto = plainToInstance(UpdateLectureDto, { title: 'Updated Title' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid videoUrl', async () => {
    const dto = plainToInstance(UpdateLectureDto, {
      videoUrl: 'https://example.com/new-video',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid videoUrl', async () => {
    const dto = plainToInstance(UpdateLectureDto, { videoUrl: 'not-a-url' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with order less than 0', async () => {
    const dto = plainToInstance(UpdateLectureDto, { order: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with all valid fields', async () => {
    const dto = plainToInstance(UpdateLectureDto, {
      title: 'Updated',
      content: 'Updated content',
      videoUrl: 'https://example.com/video',
      order: 5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
