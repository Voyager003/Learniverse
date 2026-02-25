import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddFeedbackDto {
  @ApiProperty({ example: '잘 작성하셨습니다.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  feedback: string;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
