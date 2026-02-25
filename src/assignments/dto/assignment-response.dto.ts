import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Assignment } from '../entities/assignment.entity.js';

export class AssignmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  courseId: string;

  @ApiPropertyOptional()
  courseTitle?: string;

  @ApiPropertyOptional()
  dueDate: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(assignment: Assignment): AssignmentResponseDto {
    const dto = new AssignmentResponseDto();
    dto.id = assignment.id;
    dto.title = assignment.title;
    dto.description = assignment.description;
    dto.courseId = assignment.courseId;
    dto.courseTitle = assignment.course?.title;
    dto.dueDate = assignment.dueDate;
    dto.createdAt = assignment.createdAt;
    dto.updatedAt = assignment.updatedAt;
    return dto;
  }

  static fromMany(assignments: Assignment[]): AssignmentResponseDto[] {
    return assignments.map((a) => AssignmentResponseDto.from(a));
  }
}
