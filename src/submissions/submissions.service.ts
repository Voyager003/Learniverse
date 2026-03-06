import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { In, Repository } from 'typeorm';
import { Submission, SubmissionDocument } from './schemas/submission.schema.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { AddFeedbackDto } from './dto/add-feedback.dto.js';
import { SubmissionStatus, Role } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { CourseEnrollmentPolicy } from '../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../common/policies/course-ownership.policy.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';
import { IdempotencyKey } from '../common/idempotency/entities/idempotency-key.entity.js';
import { User } from '../users/entities/user.entity.js';

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

type SubmissionWithStudentName = SubmissionDocument & { studentName?: string };

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly assignmentsService: AssignmentsService,
    private readonly courseEnrollmentPolicy: CourseEnrollmentPolicy,
    private readonly courseOwnershipPolicy: CourseOwnershipPolicy,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async submit(
    assignmentId: string,
    studentId: string,
    dto: CreateSubmissionDto,
    idempotencyKey?: string,
  ): Promise<SubmissionDocument> {
    return this.idempotencyService.execute({
      userId: studentId,
      method: 'POST',
      path: `/api/v1/assignments/${assignmentId}/submissions`,
      key: idempotencyKey,
      payload: dto,
      run: () => this.submitOnce(assignmentId, studentId, dto),
      replay: (record) => this.replaySubmission(record),
      serializeResult: (submission) => ({ submissionId: submission.id }),
      successStatus: 201,
    });
  }

  private async submitOnce(
    assignmentId: string,
    studentId: string,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionDocument> {
    // Verify assignment exists and get course info
    const assignment = await this.assignmentsService.findOne(assignmentId);

    this.assertAssignmentPublished(assignment.isPublished);
    this.assertSubmissionWithinDeadline(assignment.dueDate);
    await this.assertStudentCanSubmit(studentId, assignment.courseId);

    await this.assertNoDuplicateSubmission(assignmentId, studentId);
    return this.createSubmissionSafely(assignmentId, studentId, dto);
  }

  async findByAssignment(
    assignmentId: string,
    userId: string,
    role: Role,
  ): Promise<SubmissionWithStudentName[]> {
    const assignment = await this.assignmentsService.findOne(assignmentId);
    const readerContext = this.buildReaderContext(assignment);
    const filter = await this.buildFilterForReader(readerContext, userId, role);

    const submissions = await this.submissionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return this.attachStudentNames(submissions);
  }

  async addFeedback(
    submissionId: string,
    assignmentId: string,
    userId: string,
    dto: AddFeedbackDto,
  ): Promise<SubmissionDocument> {
    const submission = await this.findSubmissionOrFail(submissionId);
    this.assertSubmissionBelongsToAssignment(submission, assignmentId);

    // Verify ownership via assignment → course
    const assignment = await this.assignmentsService.findOne(
      submission.assignmentId,
    );
    this.courseOwnershipPolicy.assertTutorOwnsCourse(
      assignment.course.tutorId,
      userId,
    );

    const updated = await this.updateFeedbackAtomically(
      submissionId,
      assignmentId,
      dto,
    );

    if (!updated) {
      throw new ConflictException(ERROR_MESSAGES.SUBMISSION_ALREADY_REVIEWED);
    }

    return updated;
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

  private assertAssignmentPublished(isPublished: boolean): void {
    if (!isPublished) {
      throw new BadRequestException(ERROR_MESSAGES.ASSIGNMENT_NOT_PUBLISHED);
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

  private async updateFeedbackAtomically(
    submissionId: string,
    assignmentId: string,
    dto: AddFeedbackDto,
  ): Promise<SubmissionDocument | null> {
    const update: Record<string, unknown> = {
      feedback: dto.feedback,
      reviewedAt: new Date(),
    };

    if (dto.score !== undefined) {
      update.score = dto.score;
      update.status = SubmissionStatus.REVIEWED;
    } else {
      update.score = null;
      update.status = SubmissionStatus.RETURNED;
    }

    return this.submissionModel
      .findOneAndUpdate(
        {
          _id: submissionId,
          assignmentId,
          status: { $ne: SubmissionStatus.REVIEWED },
        },
        { $set: update },
        { returnDocument: 'after' },
      )
      .exec();
  }

  private async replaySubmission(
    record: IdempotencyKey,
  ): Promise<SubmissionDocument> {
    const submissionId = this.readSubmissionId(record.responseBody);
    if (!submissionId) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    return submission;
  }

  private readSubmissionId(responseBody: unknown): string | null {
    if (!responseBody || typeof responseBody !== 'object') {
      return null;
    }

    const submissionId = (responseBody as Record<string, unknown>)[
      'submissionId'
    ];
    return typeof submissionId === 'string' ? submissionId : null;
  }

  private async attachStudentNames(
    submissions: SubmissionDocument[],
  ): Promise<SubmissionWithStudentName[]> {
    if (submissions.length === 0) {
      return submissions;
    }

    const studentIds = Array.from(
      new Set(submissions.map((submission) => submission.studentId)),
    );
    const users = await this.userRepository.find({
      select: { id: true, name: true },
      where: { id: In(studentIds) },
    });
    const userNameById = new Map(
      users.map((user) => [user.id, user.name] as const),
    );

    return submissions.map((submission) =>
      Object.assign(submission, {
        studentName: userNameById.get(submission.studentId),
      }),
    );
  }
}
