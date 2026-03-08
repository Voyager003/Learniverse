import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '../../common/enums/index.js';
import { SubmissionDocument } from '../../submissions/schemas/submission.schema.js';

type AdminReadableSubmission = SubmissionDocument & {
  studentName?: string;
  id?: string;
};

export class AdminSubmissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiPropertyOptional()
  studentName?: string;

  @ApiProperty()
  assignmentId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  fileUrls: string[];

  @ApiProperty({ enum: SubmissionStatus })
  status: SubmissionStatus;

  @ApiPropertyOptional()
  feedback: string | null;

  @ApiPropertyOptional()
  score: number | null;

  @ApiPropertyOptional()
  reviewedAt: Date | null;

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

  static from(doc: AdminReadableSubmission): AdminSubmissionResponseDto {
    const dto = new AdminSubmissionResponseDto();
    dto.id = doc._id.toString();
    dto.studentId = doc.studentId;
    dto.studentName = doc.studentName;
    dto.assignmentId = doc.assignmentId;
    dto.content = doc.content;
    dto.fileUrls = doc.fileUrls;
    dto.status = doc.status;
    dto.feedback = doc.feedback;
    dto.score = doc.score;
    dto.reviewedAt = doc.reviewedAt;
    dto.isAdminHidden = doc.isAdminHidden;
    dto.adminHiddenReason = doc.adminHiddenReason;
    dto.adminHiddenAt = doc.adminHiddenAt;
    dto.createdAt = doc.createdAt;
    dto.updatedAt = doc.updatedAt;
    return dto;
  }

  static fromMany(
    docs: AdminReadableSubmission[],
  ): AdminSubmissionResponseDto[] {
    return docs.map((doc) => AdminSubmissionResponseDto.from(doc));
  }
}
