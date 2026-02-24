import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCourseDto } from './update-course.dto.js';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';

describe('UpdateCourseDto', () => {
  it('should pass with empty input (all fields optional)', async () => {
    const dto = plainToInstance(UpdateCourseDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with partial update (title only)', async () => {
    const dto = plainToInstance(UpdateCourseDto, { title: 'Updated Title' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid isPublished', async () => {
    const dto = plainToInstance(UpdateCourseDto, { isPublished: true });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid category', async () => {
    const dto = plainToInstance(UpdateCourseDto, { category: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid difficulty', async () => {
    const dto = plainToInstance(UpdateCourseDto, { difficulty: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with all valid fields', async () => {
    const dto = plainToInstance(UpdateCourseDto, {
      title: 'Updated',
      description: 'Updated description',
      category: CourseCategory.DESIGN,
      difficulty: CourseDifficulty.ADVANCED,
      isPublished: true,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
