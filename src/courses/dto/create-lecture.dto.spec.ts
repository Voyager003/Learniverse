import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLectureDto } from './create-lecture.dto.js';

describe('CreateLectureDto', () => {
  const validInput = {
    title: 'Introduction to TypeScript',
    content: 'TypeScript basics and setup guide',
    order: 1,
  };

  it('유효한 입력으로 검증을 통과해야 한다 (videoUrl 없이)', async () => {
    const dto = plainToInstance(CreateLectureDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('유효한 videoUrl로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      ...validInput,
      videoUrl: 'https://example.com/video1',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('title 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      content: validInput.content,
      order: validInput.order,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('content 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      title: validInput.title,
      order: validInput.order,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('order 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      title: validInput.title,
      content: validInput.content,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('order가 0 미만이면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      ...validInput,
      order: -1,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('유효하지 않은 videoUrl로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateLectureDto, {
      ...validInput,
      videoUrl: 'not-a-url',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
