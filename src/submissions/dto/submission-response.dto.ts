import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '../../common/enums/index.js';

interface SubmissionDoc {
  _id: { toString(): string };
  studentId: string;
  assignmentId: string;
  content: string;
  fileUrls: string[];
  status: SubmissionStatus;
  feedback: string | null;
  score: number | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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

  static from(doc: SubmissionDoc): SubmissionResponseDto {
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

  static fromMany(docs: SubmissionDoc[]): SubmissionResponseDto[] {
    return docs.map((doc) => SubmissionResponseDto.from(doc));
  }
}
