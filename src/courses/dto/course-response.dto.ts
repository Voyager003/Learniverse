import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';
import { Course } from '../entities/course.entity.js';
import { LectureResponseDto } from './lecture-response.dto.js';

export class CourseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: CourseCategory })
  category: CourseCategory;

  @ApiProperty({ enum: CourseDifficulty })
  difficulty: CourseDifficulty;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  tutorId: string;

  @ApiPropertyOptional()
  tutorName?: string;

  @ApiPropertyOptional({ type: () => [LectureResponseDto] })
  lectures?: LectureResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(course: Course): CourseResponseDto {
    const dto = new CourseResponseDto();
    dto.id = course.id;
    dto.title = course.title;
    dto.description = course.description;
    dto.category = course.category;
    dto.difficulty = course.difficulty;
    dto.isPublished = course.isPublished;
    dto.tutorId = course.tutorId;
    dto.tutorName = course.tutor?.name;
    dto.lectures = course.lectures
      ? LectureResponseDto.fromMany(course.lectures)
      : undefined;
    dto.createdAt = course.createdAt;
    dto.updatedAt = course.updatedAt;
    return dto;
  }

  static fromMany(courses: Course[]): CourseResponseDto[] {
    return courses.map((course) => CourseResponseDto.from(course));
  }
}
