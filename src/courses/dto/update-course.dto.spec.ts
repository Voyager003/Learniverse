import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCourseDto } from './update-course.dto.js';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';

describe('UpdateCourseDto', () => {
  it('빈 입력으로 검증을 통과해야 한다 (모든 필드 선택적)', async () => {
    const dto = plainToInstance(UpdateCourseDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('부분 업데이트로 검증을 통과해야 한다 (title만)', async () => {
    const dto = plainToInstance(UpdateCourseDto, { title: 'Updated Title' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('유효한 isPublished로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateCourseDto, { isPublished: true });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('유효하지 않은 category로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateCourseDto, { category: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('유효하지 않은 difficulty로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateCourseDto, { difficulty: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('모든 유효한 필드로 검증을 통과해야 한다', async () => {
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
