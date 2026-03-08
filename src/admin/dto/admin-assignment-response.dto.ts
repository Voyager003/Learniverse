import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Assignment } from '../../assignments/entities/assignment.entity.js';

export class AdminAssignmentResponseDto {
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
  isPublished: boolean;

  @ApiProperty()
  isAdminHidden: boolean;

  @ApiPropertyOptional()
  adminHiddenReason: string | null;

  @ApiPropertyOptional()
  adminHiddenAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(assignment: Assignment): AdminAssignmentResponseDto {
    const dto = new AdminAssignmentResponseDto();
    dto.id = assignment.id;
    dto.title = assignment.title;
    dto.description = assignment.description;
    dto.courseId = assignment.courseId;
    dto.courseTitle = assignment.course?.title;
    dto.dueDate = assignment.dueDate;
    dto.isPublished = assignment.isPublished;
    dto.isAdminHidden = assignment.isAdminHidden;
    dto.adminHiddenReason = assignment.adminHiddenReason;
    dto.adminHiddenAt = assignment.adminHiddenAt;
    dto.createdAt = assignment.createdAt;
    dto.updatedAt = assignment.updatedAt;
    return dto;
  }

  static fromMany(assignments: Assignment[]): AdminAssignmentResponseDto[] {
    return assignments.map((assignment) =>
      AdminAssignmentResponseDto.from(assignment),
    );
  }
}
