import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Submission, SubmissionDocument } from './schemas/submission.schema.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';
import { SubmissionStatus, Role } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly assignmentsService: AssignmentsService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async submit(
    assignmentId: string,
    studentId: string,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionDocument> {
    // Verify assignment exists and get course info
    const assignment = await this.assignmentsService.findOne(assignmentId);

    // Verify student is enrolled
    const enrolled = await this.enrollmentsService.isEnrolled(
      studentId,
      assignment.courseId,
    );
    if (!enrolled) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
    }

    // Check for duplicate submission
    const existing = await this.submissionModel.findOne({
      assignmentId,
      studentId,
    });
    if (existing) {
      throw new ConflictException('Already submitted this assignment');
    }

    return this.submissionModel.create({
      studentId,
      assignmentId,
      content: dto.content,
      fileUrls: dto.fileUrls ?? [],
    });
  }

  async findByAssignment(
    assignmentId: string,
    userId: string,
    role: Role,
  ): Promise<SubmissionDocument[]> {
    const assignment = await this.assignmentsService.findOne(assignmentId);

    interface SubmissionFilter {
      assignmentId: string;
      studentId?: string;
    }

    const filter: SubmissionFilter = { assignmentId };

    if (role === Role.ADMIN) {
      // ADMIN can see all submissions
    } else if (role === Role.TUTOR) {
      // Tutor must own the course
      if (assignment.course.tutorId !== userId) {
        throw new ForbiddenException(ERROR_MESSAGES.NOT_COURSE_OWNER);
      }
    } else {
      // STUDENT: verify enrollment and filter to own submissions
      const enrolled = await this.enrollmentsService.isEnrolled(
        userId,
        assignment.courseId,
      );
      if (!enrolled) {
        throw new ForbiddenException(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
      }
      filter.studentId = userId;
    }

    return this.submissionModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async addFeedback(
    submissionId: string,
    userId: string,
    role: Role,
    dto: AddFeedbackDto,
  ): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    // Verify ownership via assignment → course
    const assignment = await this.assignmentsService.findOne(
      submission.assignmentId,
    );
    if (role !== Role.ADMIN && assignment.course.tutorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_COURSE_OWNER);
    }

    submission.feedback = dto.feedback;
    submission.reviewedAt = new Date();

    if (dto.score !== undefined) {
      submission.score = dto.score;
      submission.status = SubmissionStatus.REVIEWED;
    } else {
      submission.status = SubmissionStatus.RETURNED;
    }

    return submission.save();
  }
}
