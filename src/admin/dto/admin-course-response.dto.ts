import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';
import { Course } from '../../courses/entities/course.entity.js';

export class AdminCourseResponseDto {
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
  tutorId: string;

  @ApiPropertyOptional()
  tutorName?: string;

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

  static from(course: Course): AdminCourseResponseDto {
    const dto = new AdminCourseResponseDto();
    dto.id = course.id;
    dto.title = course.title;
    dto.description = course.description;
    dto.category = course.category;
    dto.difficulty = course.difficulty;
    dto.tutorId = course.tutorId;
    dto.tutorName = course.tutor?.name;
    dto.isPublished = course.isPublished;
    dto.isAdminHidden = course.isAdminHidden;
    dto.adminHiddenReason = course.adminHiddenReason;
    dto.adminHiddenAt = course.adminHiddenAt;
    dto.createdAt = course.createdAt;
    dto.updatedAt = course.updatedAt;
    return dto;
  }

  static fromMany(courses: Course[]): AdminCourseResponseDto[] {
    return courses.map((course) => AdminCourseResponseDto.from(course));
  }
}
