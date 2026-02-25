import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { Role } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async create(
    courseId: string,
    userId: string,
    role: Role,
    dto: CreateAssignmentDto,
  ): Promise<Assignment> {
    const course = await this.findCourseOrFail(courseId);
    this.verifyOwnership(course, userId, role);

    // H-1: Validate dueDate is not in the past
    if (dto.dueDate && new Date(dto.dueDate) < new Date()) {
      throw new BadRequestException(ERROR_MESSAGES.DUE_DATE_IN_PAST);
    }

    const assignment = this.assignmentRepository.create({
      title: dto.title,
      description: dto.description,
      courseId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    return this.assignmentRepository.save(assignment);
  }

  async findByCourse(
    courseId: string,
    userId: string,
    role: Role,
  ): Promise<Assignment[]> {
    const course = await this.findCourseOrFail(courseId);

    if (role === Role.ADMIN) {
      // ADMIN can access all courses
    } else if (role === Role.TUTOR) {
      if (course.tutorId !== userId) {
        throw new ForbiddenException(ERROR_MESSAGES.NOT_COURSE_OWNER);
      }
    } else {
      // STUDENT: verify enrollment
      const enrolled = await this.enrollmentsService.isEnrolled(
        userId,
        courseId,
      );
      if (!enrolled) {
        throw new ForbiddenException(ERROR_MESSAGES.NOT_ENROLLED_IN_COURSE);
      }
    }

    return this.assignmentRepository.find({
      where: { courseId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException(ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND);
    }

    return assignment;
  }

  private async findCourseOrFail(courseId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(ERROR_MESSAGES.COURSE_NOT_FOUND);
    }

    return course;
  }

  private verifyOwnership(course: Course, userId: string, role: Role): void {
    if (role === Role.ADMIN) return;
    if (course.tutorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_COURSE_OWNER);
    }
  }
}
