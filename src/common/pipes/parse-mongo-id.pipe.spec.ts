import { BadRequestException } from '@nestjs/common';
import { ParseMongoIdPipe } from './parse-mongo-id.pipe.js';

describe('ParseMongoIdPipe', () => {
  let pipe: ParseMongoIdPipe;

  beforeEach(() => {
    pipe = new ParseMongoIdPipe();
  });

  it('유효한 ObjectId 문자열을 그대로 반환해야 한다', () => {
    const validId = '507f1f77bcf86cd799439011';
    expect(pipe.transform(validId)).toBe(validId);
  });

  it('유효하지 않은 ObjectId이면 BadRequestException을 던져야 한다', () => {
    expect(() => pipe.transform('invalid-id')).toThrow(BadRequestException);
  });

  it('빈 문자열이면 BadRequestException을 던져야 한다', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('숫자이면 BadRequestException을 던져야 한다', () => {
    expect(() => pipe.transform('12345')).toThrow(BadRequestException);
  });
});
