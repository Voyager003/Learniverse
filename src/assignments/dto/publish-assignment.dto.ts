import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PublishAssignmentDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isPublished: boolean;
}
