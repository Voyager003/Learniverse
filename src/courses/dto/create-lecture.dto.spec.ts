import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLectureDto } from './create-lecture.dto.js';

describe('CreateLectureDto', () => {
  const validInput = {
    title: 'Introduction to TypeScript',
    content: 'TypeScript basics and setup guide',
    order: 1,
  };

  it('should pass with valid input (without videoUrl)', async () => {
    const dto = plainToInstance(CreateLectureDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid videoUrl', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      ...validInput,
      videoUrl: 'https://example.com/video1',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail without title', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      content: validInput.content,
      order: validInput.order,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail without content', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      title: validInput.title,
      order: validInput.order,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail without order', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      title: validInput.title,
      content: validInput.content,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with order less than 0', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      ...validInput,
      order: -1,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid videoUrl', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      ...validInput,
      videoUrl: 'not-a-url',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
