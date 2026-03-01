import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { AssignmentsService } from './assignments.service.js';
import { Assignment } from './entities/assignment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { Role } from '../common/enums/index.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let assignmentRepository: MockRepository<Assignment>;
  let courseRepository: MockRepository<Course>;
  let enrollmentsService: Partial<Record<keyof EnrollmentsService, jest.Mock>>;

  beforeEach(async () => {
    assignmentRepository = createMockRepository<Assignment>();
    courseRepository = createMockRepository<Course>();
    enrollmentsService = {
      isEnrolled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: getRepositoryToken(Assignment),
          useValue: assignmentRepository,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
        {
          provide: EnrollmentsService,
          useValue: enrollmentsService,
        },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  // --- create ---

  describe('create', () => {
    const dto: CreateAssignmentDto = {
      title: 'Guard 구현',
      description: 'JwtAuthGuard를 직접 구현해보세요.',
    };

    it('Tutor가 소유한 강좌에 과제를 생성해야 한다', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const assignment = {
        id: 'assignment-uuid',
        ...dto,
        courseId: 'course-uuid',
      } as Assignment;

      courseRepository.findOne!.mockResolvedValue(course);
      assignmentRepository.create!.mockReturnValue(assignment);
      assignmentRepository.save!.mockResolvedValue(assignment);

      const result = await service.create(
        'course-uuid',
        'tutor-uuid',
        Role.TUTOR,
        dto,
      );

      expect(result).toEqual(assignment);
      expect(assignmentRepository.create).toHaveBeenCalledWith({
        ...dto,
        courseId: 'course-uuid',
        dueDate: undefined,
      });
    });

    it('ADMIN은 모든 강좌에 과제를 생성할 수 있어야 한다', async () => {
      const course = {
        id: 'course-uuid',
        tutorId: 'other-tutor',
      } as Course;
      const assignment = { id: 'assignment-uuid' } as Assignment;

      courseRepository.findOne!.mockResolvedValue(course);
      assignmentRepository.create!.mockReturnValue(assignment);
      assignmentRepository.save!.mockResolvedValue(assignment);

      const result = await service.create(
        'course-uuid',
        'admin-uuid',
        Role.ADMIN,
        dto,
      );

      expect(result).toEqual(assignment);
    });

    it('소유자가 아닌 Tutor이면 ForbiddenException을 던져야 한다', async () => {
      const course = {
        id: 'course-uuid',
        tutorId: 'other-tutor',
      } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.create('course-uuid', 'tutor-uuid', Role.TUTOR, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('강좌를 찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', 'tutor-uuid', Role.TUTOR, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('과거 dueDate이면 BadRequestException을 던져야 한다', async () => {
      const dtoWithPastDue = {
        ...dto,
        dueDate: '2020-01-01T00:00:00.000Z',
      };
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;

      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.create('course-uuid', 'tutor-uuid', Role.TUTOR, dtoWithPastDue),
      ).rejects.toThrow(BadRequestException);
    });

    it('dueDate가 포함된 과제를 생성해야 한다', async () => {
      const futureDueDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24,
      ).toISOString();
      const dtoWithDue = { ...dto, dueDate: futureDueDate };
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const assignment = { id: 'assignment-uuid' } as Assignment;

      courseRepository.findOne!.mockResolvedValue(course);
      assignmentRepository.create!.mockReturnValue(assignment);
      assignmentRepository.save!.mockResolvedValue(assignment);

      await service.create('course-uuid', 'tutor-uuid', Role.TUTOR, dtoWithDue);

      expect(assignmentRepository.create).toHaveBeenCalledWith({
        title: dto.title,
        description: dto.description,
        courseId: 'course-uuid',
        dueDate: new Date(futureDueDate),
      });
    });
  });

  // --- findByCourse ---

  describe('findByCourse', () => {
    it('Tutor가 소유한 강좌의 과제를 반환해야 한다', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const assignments = [{ id: 'a1' }, { id: 'a2' }] as Assignment[];

      courseRepository.findOne!.mockResolvedValue(course);
      assignmentRepository.find!.mockResolvedValue(assignments);

      const result = await service.findByCourse(
        'course-uuid',
        'tutor-uuid',
        Role.TUTOR,
      );

      expect(result).toEqual(assignments);
      expect(assignmentRepository.find).toHaveBeenCalledWith({
        where: { courseId: 'course-uuid' },
        relations: ['course'],
        order: { createdAt: 'DESC' },
      });
    });

    it('수강 중인 학생이 과제를 조회할 수 있어야 한다', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const assignments = [{ id: 'a1' }] as Assignment[];

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentsService.isEnrolled!.mockResolvedValue(true);
      assignmentRepository.find!.mockResolvedValue(assignments);

      const result = await service.findByCourse(
        'course-uuid',
        'student-uuid',
        Role.STUDENT,
      );

      expect(result).toEqual(assignments);
      expect(enrollmentsService.isEnrolled).toHaveBeenCalledWith(
        'student-uuid',
        'course-uuid',
      );
    });

    it('수강하지 않은 학생이면 ForbiddenException을 던져야 한다', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;

      courseRepository.findOne!.mockResolvedValue(course);
      enrollmentsService.isEnrolled!.mockResolvedValue(false);

      await expect(
        service.findByCourse('course-uuid', 'student-uuid', Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN은 모든 강좌의 과제를 조회할 수 있어야 한다', async () => {
      const course = {
        id: 'course-uuid',
        tutorId: 'other-tutor',
      } as Course;
      const assignments = [{ id: 'a1' }] as Assignment[];

      courseRepository.findOne!.mockResolvedValue(course);
      assignmentRepository.find!.mockResolvedValue(assignments);

      const result = await service.findByCourse(
        'course-uuid',
        'admin-uuid',
        Role.ADMIN,
      );

      expect(result).toEqual(assignments);
    });

    it('소유자가 아닌 Tutor이면 ForbiddenException을 던져야 한다', async () => {
      const course = {
        id: 'course-uuid',
        tutorId: 'other-tutor',
      } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.findByCourse('course-uuid', 'tutor-uuid', Role.TUTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('강좌를 찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.findByCourse('nonexistent', 'tutor-uuid', Role.TUTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- findOne ---

  describe('findOne', () => {
    it('과제를 반환해야 한다', async () => {
      const assignment = {
        id: 'assignment-uuid',
        courseId: 'course-uuid',
      } as Assignment;
      assignmentRepository.findOne!.mockResolvedValue(assignment);

      const result = await service.findOne('assignment-uuid');

      expect(result).toEqual(assignment);
      expect(assignmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'assignment-uuid' },
        relations: ['course'],
      });
    });

    it('찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      assignmentRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
