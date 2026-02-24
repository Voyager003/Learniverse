import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CourseQueryDto } from './course-query.dto.js';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';

describe('CourseQueryDto', () => {
  it('필터 없이 검증을 통과해야 한다 (페이지네이션 기본값 상속)', async () => {
    const dto = plainToInstance(CourseQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('유효한 category 필터로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CourseQueryDto, {
      category: CourseCategory.PROGRAMMING,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.category).toBe(CourseCategory.PROGRAMMING);
  });

  it('유효한 difficulty 필터로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CourseQueryDto, {
      difficulty: CourseDifficulty.ADVANCED,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.difficulty).toBe(CourseDifficulty.ADVANCED);
  });

  it('두 필터와 페이지네이션 함께 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CourseQueryDto, {
      category: CourseCategory.DESIGN,
      difficulty: CourseDifficulty.INTERMEDIATE,
      page: 2,
      limit: 20,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('유효하지 않은 category로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CourseQueryDto, { category: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('유효하지 않은 difficulty로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CourseQueryDto, { difficulty: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
