import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSubmissionDto } from './create-submission.dto.js';

describe('CreateSubmissionDto', () => {
  const validInput = {
    content: '과제 답안입니다.',
  };

  it('유효한 입력으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateSubmissionDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fileUrls가 포함된 입력으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateSubmissionDto, {
      ...validInput,
      fileUrls: ['https://example.com/file.pdf'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fileUrls 없이도 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(CreateSubmissionDto, validInput);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('content 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateSubmissionDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('빈 content로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateSubmissionDto, { content: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fileUrls에 URL이 아닌 값이 있으면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(CreateSubmissionDto, {
      ...validInput,
      fileUrls: ['not-a-url'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
