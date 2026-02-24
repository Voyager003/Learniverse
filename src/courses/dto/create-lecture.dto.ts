import {
  IsString,
  IsInt,
  IsOptional,
  IsUrl,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLectureDto {
  @ApiProperty({ example: 'Introduction to TypeScript', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'TypeScript basics and setup guide',
    maxLength: 50000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/video1' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  order: number;
}
