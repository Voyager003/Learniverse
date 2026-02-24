import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto.js';

describe('PaginationQueryDto', () => {
  it('입력이 없을 때 기본값을 사용해야 한다', async () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('유효한 page와 limit을 허용해야 한다', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 2, limit: 20 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
  });

  it('page가 1 미만이면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('limit이 100을 초과하면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(PaginationQueryDto, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('문자열 값을 숫자로 변환해야 한다', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: '3',
      limit: '15',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(15);
  });
});
