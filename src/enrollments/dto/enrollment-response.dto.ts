import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '../../common/enums/index.js';
import { Enrollment } from '../entities/enrollment.entity.js';

export class EnrollmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiPropertyOptional()
  studentName?: string;

  @ApiProperty()
  courseId: string;

  @ApiPropertyOptional()
  courseTitle?: string;

  @ApiProperty({ enum: EnrollmentStatus })
  status: EnrollmentStatus;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(enrollment: Enrollment): EnrollmentResponseDto {
    const dto = new EnrollmentResponseDto();
    dto.id = enrollment.id;
    dto.studentId = enrollment.studentId;
    dto.studentName = enrollment.student?.name;
    dto.courseId = enrollment.courseId;
    dto.courseTitle = enrollment.course?.title;
    dto.status = enrollment.status;
    dto.progress = enrollment.progress;
    dto.createdAt = enrollment.createdAt;
    dto.updatedAt = enrollment.updatedAt;
    return dto;
  }

  static fromMany(enrollments: Enrollment[]): EnrollmentResponseDto[] {
    return enrollments.map((enrollment) =>
      EnrollmentResponseDto.from(enrollment),
    );
  }
}
