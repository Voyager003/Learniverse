import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CourseQueryDto } from './course-query.dto.js';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';

describe('CourseQueryDto', () => {
  it('should pass with no filters (inherits pagination defaults)', async () => {
    const dto = plainToInstance(CourseQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('should pass with valid category filter', async () => {
    const dto = plainToInstance(CourseQueryDto, {
      category: CourseCategory.PROGRAMMING,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.category).toBe(CourseCategory.PROGRAMMING);
  });

  it('should pass with valid difficulty filter', async () => {
    const dto = plainToInstance(CourseQueryDto, {
      difficulty: CourseDifficulty.ADVANCED,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.difficulty).toBe(CourseDifficulty.ADVANCED);
  });

  it('should pass with both filters and pagination', async () => {
    const dto = plainToInstance(CourseQueryDto, {
      category: CourseCategory.DESIGN,
      difficulty: CourseDifficulty.INTERMEDIATE,
      page: 2,
      limit: 20,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid category', async () => {
    const dto = plainToInstance(CourseQueryDto, { category: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid difficulty', async () => {
    const dto = plainToInstance(CourseQueryDto, { difficulty: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
