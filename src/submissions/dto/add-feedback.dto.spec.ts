import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AddFeedbackDto } from './add-feedback.dto.js';

describe('AddFeedbackDto', () => {
  it('유효한 입력으로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(AddFeedbackDto, {
      feedback: '잘 작성하셨습니다.',
      score: 95,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('score 없이도 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(AddFeedbackDto, {
      feedback: '수정이 필요합니다.',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('feedback 없이 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(AddFeedbackDto, { score: 80 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('빈 feedback으로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(AddFeedbackDto, { feedback: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('음수 score로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(AddFeedbackDto, {
      feedback: 'feedback',
      score: -1,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('100 초과 score로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(AddFeedbackDto, {
      feedback: 'feedback',
      score: 101,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
