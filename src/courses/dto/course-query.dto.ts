import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CourseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CourseCategory })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @ApiPropertyOptional({ enum: CourseDifficulty })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;
}
