import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SubmissionStatus } from '../../common/enums/index.js';

export type SubmissionDocument = HydratedDocument<Submission>;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ required: true })
  studentId: string;

  @Prop({ required: true })
  assignmentId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  fileUrls: string[] = [];

  @Prop({
    type: String,
    enum: SubmissionStatus,
    default: SubmissionStatus.SUBMITTED,
  })
  status: SubmissionStatus = SubmissionStatus.SUBMITTED;

  @Prop({ type: String, default: null })
  feedback: string | null = null;

  @Prop({ type: Number, default: null })
  score: number | null = null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null = null;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
