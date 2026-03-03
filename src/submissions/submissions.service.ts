import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Submission, SubmissionDocument } from './schemas/submission.schema.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';
import { SubmissionStatus, Role } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { SubmissionAccessPolicy } from './policies/submission-access.policy.js';

interface MongoError extends Error {
  code?: number;
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly assignmentsService: AssignmentsService,
    private readonly submissionAccessPolicy: SubmissionAccessPolicy,
  ) {}

  async submit(
    assignmentId: string,
    studentId: string,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionDocument> {
    // Verify assignment exists and get course info
    const assignment = await this.assignmentsService.findOne(assignmentId);

    // H-2: Check submission deadline
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      throw new BadRequestException(ERROR_MESSAGES.SUBMISSION_DEADLINE_PASSED);
    }

    // Verify student is enrolled
    await this.submissionAccessPolicy.assertStudentEnrolled(
      studentId,
      assignment.courseId,
    );

    // C-2: Check for duplicate submission (app-level)
    const existing = await this.submissionModel.findOne({
      assignmentId,
      studentId,
    });
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_SUBMITTED);
    }

    // C-1: Handle MongoDB unique index violation (race condition safety)
    try {
      return await this.submissionModel.create({
        studentId,
        assignmentId,
        content: dto.content,
        fileUrls: dto.fileUrls ?? [],
      });
    } catch (error: unknown) {
      const mongoError = error as MongoError;
      if (mongoError.code === 11000) {
        throw new ConflictException(ERROR_MESSAGES.ALREADY_SUBMITTED);
      }
      throw error;
    }
  }

  async findByAssignment(
    assignmentId: string,
    userId: string,
    role: Role,
  ): Promise<SubmissionDocument[]> {
    const assignment = await this.assignmentsService.findOne(assignmentId);
    const filter = await this.submissionAccessPolicy.buildSubmissionFilter({
      assignmentId,
      courseId: assignment.courseId,
      courseTutorId: assignment.course.tutorId,
      userId,
      role,
    });

    return this.submissionModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async addFeedback(
    submissionId: string,
    assignmentId: string,
    userId: string,
    dto: AddFeedbackDto,
  ): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    // H-4: Verify submission belongs to the assignment in the URL
    if (submission.assignmentId !== assignmentId) {
      throw new BadRequestException(
        ERROR_MESSAGES.SUBMISSION_ASSIGNMENT_MISMATCH,
      );
    }

    // H-3: Guard against re-feedback on already REVIEWED submissions
    if (submission.status === SubmissionStatus.REVIEWED) {
      throw new ConflictException(ERROR_MESSAGES.SUBMISSION_ALREADY_REVIEWED);
    }

    // Verify ownership via assignment → course
    const assignment = await this.assignmentsService.findOne(
      submission.assignmentId,
    );
    this.submissionAccessPolicy.assertTutorOwnsCourse(
      assignment.course.tutorId,
      userId,
    );

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
