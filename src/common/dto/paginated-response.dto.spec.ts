import { PaginatedResponseDto } from './paginated-response.dto.js';

describe('PaginatedResponseDto', () => {
  it('totalPages를 올바르게 계산해야 한다', () => {
    const result = new PaginatedResponseDto([1, 2, 3], 25, 1, 10);
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
  });

  it('정확히 나누어지는 경우를 처리해야 한다', () => {
    const result = new PaginatedResponseDto([], 20, 1, 10);
    expect(result.totalPages).toBe(2);
  });

  it('빈 결과를 처리해야 한다', () => {
    const result = new PaginatedResponseDto([], 0, 1, 10);
    expect(result.totalPages).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('단일 항목을 처리해야 한다', () => {
    const result = new PaginatedResponseDto(['item'], 1, 1, 10);
    expect(result.totalPages).toBe(1);
  });
});
