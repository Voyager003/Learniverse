import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { Course } from '../courses/entities/course.entity.js';
import {
  Submission,
  SubmissionDocument,
} from '../submissions/schemas/submission.schema.js';
import { User } from '../users/entities/user.entity.js';
import { AdminAuditService } from './admin-audit.service.js';
import { AdminAssignmentQueryDto } from './dto/admin-assignment-query.dto.js';
import { AdminCourseQueryDto } from './dto/admin-course-query.dto.js';
import { AdminSubmissionQueryDto } from './dto/admin-submission-query.dto.js';
import { UpdateAdminModerationDto } from './dto/update-admin-moderation.dto.js';

type SubmissionWithStudentName = SubmissionDocument & { studentName?: string };

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async findAllCourses(
    query: AdminCourseQueryDto,
  ): Promise<PaginatedResponseDto<Course>> {
    const { page, limit, tutorId, isPublished, isAdminHidden } = query;
    const where: FindOptionsWhere<Course> = {};

    if (tutorId) {
      where.tutorId = tutorId;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (isAdminHidden !== undefined) {
      where.isAdminHidden = isAdminHidden;
    }

    const [data, total] = await this.courseRepository.findAndCount({
      where,
      relations: ['tutor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findCourseById(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['tutor', 'lectures'],
    });
    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    return course;
  }

  async updateCourseModeration(
    actorId: string,
    courseId: string,
    dto: UpdateAdminModerationDto,
  ): Promise<Course> {
    const course = await this.findCourseById(courseId);
    const beforeState = this.createModerationSnapshot(course);

    course.isAdminHidden = dto.isHidden;
    course.adminHiddenReason = dto.isHidden ? (dto.reason ?? null) : null;
    course.adminHiddenAt = dto.isHidden ? new Date() : null;

    const updated = await this.courseRepository.save(course);
    await this.recordModerationAudit(
      actorId,
      'courses.update_moderation',
      'course',
      courseId,
      beforeState,
      updated,
      dto.reason,
    );

    return updated;
  }

  async findAllAssignments(
    query: AdminAssignmentQueryDto,
  ): Promise<PaginatedResponseDto<Assignment>> {
    const { page, limit, courseId, isPublished, isAdminHidden } = query;
    const where: FindOptionsWhere<Assignment> = {};

    if (courseId) {
      where.courseId = courseId;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (isAdminHidden !== undefined) {
      where.isAdminHidden = isAdminHidden;
    }

    const [data, total] = await this.assignmentRepository.findAndCount({
      where,
      relations: ['course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAssignmentById(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!assignment) {
      throw new NotFoundException(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);
    }

    return assignment;
  }

  async updateAssignmentModeration(
    actorId: string,
    assignmentId: string,
    dto: UpdateAdminModerationDto,
  ): Promise<Assignment> {
    const assignment = await this.findAssignmentById(assignmentId);
    const beforeState = this.createModerationSnapshot(assignment);

    assignment.isAdminHidden = dto.isHidden;
    assignment.adminHiddenReason = dto.isHidden ? (dto.reason ?? null) : null;
    assignment.adminHiddenAt = dto.isHidden ? new Date() : null;

    const updated = await this.assignmentRepository.save(assignment);
    await this.recordModerationAudit(
      actorId,
      'assignments.update_moderation',
      'assignment',
      assignmentId,
      beforeState,
      updated,
      dto.reason,
    );

    return updated;
  }

  async findAllSubmissions(
    query: AdminSubmissionQueryDto,
  ): Promise<PaginatedResponseDto<SubmissionWithStudentName>> {
    const { page, limit } = query;
    const filter = await this.buildSubmissionFilter(query);

    const submissions = await this.submissionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.submissionModel.countDocuments(filter);
    const data = await this.attachStudentNames(submissions);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findSubmissionById(id: string): Promise<SubmissionWithStudentName> {
    const submission = await this.submissionModel.findById(id).exec();
    if (!submission) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    const [withName] = await this.attachStudentNames([submission]);
    return withName;
  }

  async updateSubmissionModeration(
    actorId: string,
    submissionId: string,
    dto: UpdateAdminModerationDto,
  ): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    const beforeState = this.createModerationSnapshot(submission);
    const updated = await this.submissionModel
      .findByIdAndUpdate(
        submissionId,
        {
          $set: {
            isAdminHidden: dto.isHidden,
            adminHiddenReason: dto.isHidden ? (dto.reason ?? null) : null,
            adminHiddenAt: dto.isHidden ? new Date() : null,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    await this.recordModerationAudit(
      actorId,
      'submissions.update_moderation',
      'submission',
      submissionId,
      beforeState,
      updated,
      dto.reason,
    );

    return updated;
  }

  private async buildSubmissionFilter(
    query: AdminSubmissionQueryDto,
  ): Promise<Record<string, unknown>> {
    const filter: Record<string, unknown> = {};

    if (query.assignmentId) {
      filter.assignmentId = query.assignmentId;
    }

    if (query.studentId) {
      filter.studentId = query.studentId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.isAdminHidden !== undefined) {
      filter.isAdminHidden = query.isAdminHidden;
    }

    if (query.courseId) {
      const assignments = await this.assignmentRepository.find({
        where: { courseId: query.courseId },
        select: { id: true },
      });
      const assignmentIds = assignments.map((assignment) => assignment.id);
      filter.assignmentId = query.assignmentId
        ? query.assignmentId
        : { $in: assignmentIds };
    }

    return filter;
  }

  private async attachStudentNames(
    submissions: SubmissionDocument[],
  ): Promise<SubmissionWithStudentName[]> {
    if (submissions.length === 0) {
      return [];
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

  private createModerationSnapshot(
    entity: Pick<Course, 'isAdminHidden' | 'adminHiddenReason'>,
  ) {
    return {
      isAdminHidden: entity.isAdminHidden,
      adminHiddenReason: entity.adminHiddenReason,
    };
  }

  private async recordModerationAudit(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    beforeState: { isAdminHidden: boolean; adminHiddenReason: string | null },
    afterEntity: Pick<Course, 'isAdminHidden' | 'adminHiddenReason'>,
    reason?: string,
  ): Promise<void> {
    await this.adminAuditService.record({
      actorId,
      action,
      resourceType,
      resourceId,
      beforeState,
      afterState: {
        isAdminHidden: afterEntity.isAdminHidden,
        adminHiddenReason: afterEntity.adminHiddenReason,
      },
      metadata: reason ? { reason } : null,
    });
  }
}
