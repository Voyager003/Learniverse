import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';

export class CreateCourseDto {
  @ApiProperty({ example: 'NestJS Fundamentals', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Learn NestJS from scratch' })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({ enum: CourseCategory, example: CourseCategory.PROGRAMMING })
  @IsEnum(CourseCategory)
  category: CourseCategory;

  @ApiProperty({ enum: CourseDifficulty, example: CourseDifficulty.BEGINNER })
  @IsEnum(CourseDifficulty)
  difficulty: CourseDifficulty;
}
