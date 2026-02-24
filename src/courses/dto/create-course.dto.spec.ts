import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCourseDto } from './create-course.dto.js';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';

describe('CreateCourseDto', () => {
  const validInput = {
    title: 'NestJS Fundamentals',
    description: 'Learn NestJS from scratch',
    category: CourseCategory.PROGRAMMING,
    difficulty: CourseDifficulty.BEGINNER,
  };

  it('유효한 입력으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateCourseDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('title 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      description: validInput.description,
      category: validInput.category,
      difficulty: validInput.difficulty,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('description 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      title: validInput.title,
      category: validInput.category,
      difficulty: validInput.difficulty,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('유효하지 않은 category로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...validInput,
      category: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('유효하지 않은 difficulty로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...validInput,
      difficulty: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('title이 200자를 초과하면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...validInput,
      title: 'a'.repeat(201),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
