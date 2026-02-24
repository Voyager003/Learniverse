import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateLectureDto } from './update-lecture.dto.js';

describe('UpdateLectureDto', () => {
  it('빈 입력으로 검증을 통과해야 한다 (모든 필드 선택적)', async () => {
    const dto = plainToInstance(UpdateLectureDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('부분 업데이트로 검증을 통과해야 한다 (title만)', async () => {
    const dto = plainToInstance(UpdateLectureDto, { title: 'Updated Title' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('유효한 videoUrl로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateLectureDto, {
      videoUrl: 'https://example.com/new-video',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('유효하지 않은 videoUrl로 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateLectureDto, { videoUrl: 'not-a-url' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('order가 0 미만이면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(UpdateLectureDto, { order: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('모든 유효한 필드로 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(UpdateLectureDto, {
      title: 'Updated',
      content: 'Updated content',
      videoUrl: 'https://example.com/video',
      order: 5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
