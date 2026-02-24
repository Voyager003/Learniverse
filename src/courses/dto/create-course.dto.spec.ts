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

  it('should pass with valid input', async () => {
    const dto = plainToInstance(CreateCourseDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail without title', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      description: validInput.description,
      category: validInput.category,
      difficulty: validInput.difficulty,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail without description', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      title: validInput.title,
      category: validInput.category,
      difficulty: validInput.difficulty,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid category', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...validInput,
      category: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid difficulty', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...validInput,
      difficulty: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with title exceeding 200 characters', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      ...validInput,
      title: 'a'.repeat(201),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
