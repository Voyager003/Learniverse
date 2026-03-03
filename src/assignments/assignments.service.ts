import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { Role } from '../common/enums/index.js';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constant.js';
import { CourseEnrollmentPolicy } from '../common/policies/course-enrollment.policy.js';
import { CourseOwnershipPolicy } from '../common/policies/course-ownership.policy.js';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly courseEnrollmentPolicy: CourseEnrollmentPolicy,
    private readonly courseOwnershipPolicy: CourseOwnershipPolicy,
  ) {}

  async create(
    courseId: string,
    userId: string,
    dto: CreateAssignmentDto,
  ): Promise<Assignment> {
    const course = await this.findCourseOrFail(courseId);
    this.courseOwnershipPolicy.assertTutorOwnsCourse(course.tutorId, userId);

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
    await this.authorizeCourseReader(course, userId, role);

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

  private async authorizeCourseReader(
    course: Pick<Course, 'id' | 'tutorId'>,
    userId: string,
    role: Role,
  ): Promise<void> {
    if (role === Role.TUTOR) {
      this.courseOwnershipPolicy.assertTutorOwnsCourse(course.tutorId, userId);
      return;
    }

    await this.courseEnrollmentPolicy.assertStudentEnrolled(userId, course.id);
  }
}
