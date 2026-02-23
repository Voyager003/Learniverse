import { PaginatedResponseDto } from './paginated-response.dto.js';

describe('PaginatedResponseDto', () => {
  it('should calculate totalPages correctly', () => {
    const result = new PaginatedResponseDto([1, 2, 3], 25, 1, 10);
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
  });

  it('should handle exact division', () => {
    const result = new PaginatedResponseDto([], 20, 1, 10);
    expect(result.totalPages).toBe(2);
  });

  it('should handle empty result', () => {
    const result = new PaginatedResponseDto([], 0, 1, 10);
    expect(result.totalPages).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('should handle single item', () => {
    const result = new PaginatedResponseDto(['item'], 1, 1, 10);
    expect(result.totalPages).toBe(1);
  });
});
