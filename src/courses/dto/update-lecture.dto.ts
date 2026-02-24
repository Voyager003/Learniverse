import {
  IsOptional,
  IsString,
  IsInt,
  IsUrl,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLectureDto {
  @ApiPropertyOptional({ example: 'Updated Title', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated content', maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-video' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
