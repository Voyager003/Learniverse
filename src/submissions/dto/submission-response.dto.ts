import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '../../common/enums/index.js';
import { SubmissionDocument } from '../schemas/submission.schema.js';

export class SubmissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

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
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(doc: SubmissionDocument): SubmissionResponseDto {
    const dto = new SubmissionResponseDto();
    dto.id = doc._id.toString();
    dto.studentId = doc.studentId;
    dto.assignmentId = doc.assignmentId;
    dto.content = doc.content;
    dto.fileUrls = doc.fileUrls;
    dto.status = doc.status;
    dto.feedback = doc.feedback;
    dto.score = doc.score;
    dto.reviewedAt = doc.reviewedAt;
    dto.createdAt = doc.createdAt;
    dto.updatedAt = doc.updatedAt;
    return dto;
  }

  static fromMany(docs: SubmissionDocument[]): SubmissionResponseDto[] {
    return docs.map((doc) => SubmissionResponseDto.from(doc));
  }
}
