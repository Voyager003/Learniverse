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
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';
import { SubmissionStatus, Role } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { CourseEnrollmentPolicy } from '../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../common/policies/course-ownership.policy.js';

interface MongoError extends Error {
  code?: number;
}

interface SubmissionFilter {
  assignmentId: string;
  studentId?: string;
}

interface SubmissionReaderContext {
  assignmentId: string;
  courseId: string;
  courseTutorId: string;
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly assignmentsService: AssignmentsService,
    private readonly courseEnrollmentPolicy: CourseEnrollmentPolicy,
    private readonly courseOwnershipPolicy: CourseOwnershipPolicy,
  ) {}

  async submit(
    assignmentId: string,
    studentId: string,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionDocument> {
    // Verify assignment exists and get course info
    const assignment = await this.assignmentsService.findOne(assignmentId);

    this.assertSubmissionWithinDeadline(assignment.dueDate);
    await this.assertStudentCanSubmit(studentId, assignment.courseId);

    await this.assertNoDuplicateSubmission(assignmentId, studentId);
    return this.createSubmissionSafely(assignmentId, studentId, dto);
  }

  async findByAssignment(
    assignmentId: string,
    userId: string,
    role: Role,
  ): Promise<SubmissionDocument[]> {
    const assignment = await this.assignmentsService.findOne(assignmentId);
    const readerContext = this.buildReaderContext(assignment);
    const filter = await this.buildFilterForReader(readerContext, userId, role);

    return this.submissionModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async addFeedback(
    submissionId: string,
    assignmentId: string,
    userId: string,
    dto: AddFeedbackDto,
  ): Promise<SubmissionDocument> {
    const submission = await this.findSubmissionOrFail(submissionId);
    this.assertSubmissionBelongsToAssignment(submission, assignmentId);
    this.assertFeedbackAllowed(submission);

    // Verify ownership via assignment → course
    const assignment = await this.assignmentsService.findOne(
      submission.assignmentId,
    );
    this.courseOwnershipPolicy.assertTutorOwnsCourse(
      assignment.course.tutorId,
      userId,
    );

    this.applyFeedback(submission, dto);

    return submission.save();
  }

  private async buildFilterForReader(
    context: SubmissionReaderContext,
    userId: string,
    role: Role,
  ): Promise<SubmissionFilter> {
    const filter: SubmissionFilter = { assignmentId: context.assignmentId };

    if (role === Role.TUTOR) {
      this.courseOwnershipPolicy.assertTutorOwnsCourse(
        context.courseTutorId,
        userId,
      );
      return filter;
    }

    await this.courseEnrollmentPolicy.assertStudentEnrolled(
      userId,
      context.courseId,
    );
    filter.studentId = userId;
    return filter;
  }

  private buildReaderContext(assignment: Assignment): SubmissionReaderContext {
    return {
      assignmentId: assignment.id,
      courseId: assignment.courseId,
      courseTutorId: assignment.course.tutorId,
    };
  }

  private async assertNoDuplicateSubmission(
    assignmentId: string,
    studentId: string,
  ): Promise<void> {
    // C-2: Check for duplicate submission (app-level)
    const existing = await this.submissionModel.findOne({
      assignmentId,
      studentId,
    });

    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_SUBMITTED);
    }
  }

  private assertSubmissionWithinDeadline(dueDate?: Date | null): void {
    // H-2: Check submission deadline
    if (dueDate && new Date() > dueDate) {
      throw new BadRequestException(ERROR_MESSAGES.SUBMISSION_DEADLINE_PASSED);
    }
  }

  private async assertStudentCanSubmit(
    studentId: string,
    courseId: string,
  ): Promise<void> {
    // Verify student is enrolled
    await this.courseEnrollmentPolicy.assertStudentEnrolled(
      studentId,
      courseId,
    );
  }

  private async createSubmissionSafely(
    assignmentId: string,
    studentId: string,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionDocument> {
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

  private async findSubmissionOrFail(
    submissionId: string,
  ): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId);

    if (!submission) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    return submission;
  }

  private assertSubmissionBelongsToAssignment(
    submission: SubmissionDocument,
    assignmentId: string,
  ): void {
    // H-4: Verify submission belongs to the assignment in the URL
    if (submission.assignmentId !== assignmentId) {
      throw new BadRequestException(
        ERROR_MESSAGES.SUBMISSION_ASSIGNMENT_MISMATCH,
      );
    }
  }

  private assertFeedbackAllowed(submission: SubmissionDocument): void {
    // H-3: Guard against re-feedback on already REVIEWED submissions
    if (submission.status === SubmissionStatus.REVIEWED) {
      throw new ConflictException(ERROR_MESSAGES.SUBMISSION_ALREADY_REVIEWED);
    }
  }

  private applyFeedback(
    submission: SubmissionDocument,
    dto: AddFeedbackDto,
  ): void {
    submission.feedback = dto.feedback;
    submission.reviewedAt = new Date();

    if (dto.score !== undefined) {
      submission.score = dto.score;
      submission.status = SubmissionStatus.REVIEWED;
      return;
    }

    submission.status = SubmissionStatus.RETURNED;
  }
}
