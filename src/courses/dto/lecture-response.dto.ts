import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Lecture } from '../entities/lecture.entity.js';

export class LectureResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  videoUrl: string | null;

  @ApiProperty()
  order: number;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(lecture: Lecture): LectureResponseDto {
    const dto = new LectureResponseDto();
    dto.id = lecture.id;
    dto.title = lecture.title;
    dto.content = lecture.content;
    dto.videoUrl = lecture.videoUrl;
    dto.order = lecture.order;
    dto.courseId = lecture.courseId;
    dto.createdAt = lecture.createdAt;
    dto.updatedAt = lecture.updatedAt;
    return dto;
  }

  static fromMany(lectures: Lecture[]): LectureResponseDto[] {
    return lectures.map((lecture) => LectureResponseDto.from(lecture));
  }
}
