import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ObjectLiteral,
  QueryFailedError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CoursesService } from './courses.service.js';
import { Course } from './entities/course.entity.js';
import { Lecture } from './entities/lecture.entity.js';
import {
  CourseCategory,
  CourseDifficulty,
  Role,
} from '../common/enums/index.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseQueryDto } from './dto/course-query.dto.js';
import { CreateLectureDto } from './dto/create-lecture.dto.js';
import { UpdateLectureDto } from './dto/update-lecture.dto.js';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: MockRepository<Course>;
  let lectureRepository: MockRepository<Lecture>;

  beforeEach(async () => {
    courseRepository = createMockRepository<Course>();
    lectureRepository = createMockRepository<Lecture>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
        {
          provide: getRepositoryToken(Lecture),
          useValue: lectureRepository,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  // --- Course CRUD ---

  describe('create', () => {
    it('should create and return a course', async () => {
      const dto: CreateCourseDto = {
        title: 'NestJS Fundamentals',
        description: 'Learn NestJS',
        category: CourseCategory.PROGRAMMING,
        difficulty: CourseDifficulty.BEGINNER,
      };
      const course = {
        id: 'course-uuid',
        ...dto,
        tutorId: 'tutor-uuid',
      } as Course;

      courseRepository.create!.mockReturnValue(course);
      courseRepository.save!.mockResolvedValue(course);

      const result = await service.create('tutor-uuid', dto);

      expect(result).toEqual(course);
      expect(courseRepository.create).toHaveBeenCalledWith({
        ...dto,
        tutorId: 'tutor-uuid',
      });
      expect(courseRepository.save).toHaveBeenCalledWith(course);
    });
  });

  describe('findAll', () => {
    let mockQueryBuilder: Partial<Record<string, jest.Mock>>;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      };
      courseRepository.createQueryBuilder!.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Course>,
      );
    });

    it('should return paginated courses with defaults', async () => {
      const courses = [{ id: 'c1' }, { id: 'c2' }] as Course[];
      mockQueryBuilder.getManyAndCount!.mockResolvedValue([courses, 2]);

      const query: CourseQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.data).toEqual(courses);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should filter by isPublished = true', async () => {
      mockQueryBuilder.getManyAndCount!.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 10 });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'course.isPublished = :isPublished',
        { isPublished: true },
      );
    });

    it('should apply category filter', async () => {
      mockQueryBuilder.getManyAndCount!.mockResolvedValue([[], 0]);

      const query: CourseQueryDto = {
        page: 1,
        limit: 10,
        category: CourseCategory.PROGRAMMING,
      };
      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.category = :category',
        { category: CourseCategory.PROGRAMMING },
      );
    });

    it('should apply difficulty filter', async () => {
      mockQueryBuilder.getManyAndCount!.mockResolvedValue([[], 0]);

      const query: CourseQueryDto = {
        page: 1,
        limit: 10,
        difficulty: CourseDifficulty.ADVANCED,
      };
      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.difficulty = :difficulty',
        { difficulty: CourseDifficulty.ADVANCED },
      );
    });

    it('should apply both category and difficulty filters', async () => {
      mockQueryBuilder.getManyAndCount!.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        category: CourseCategory.DESIGN,
        difficulty: CourseDifficulty.INTERMEDIATE,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.category = :category',
        { category: CourseCategory.DESIGN },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.difficulty = :difficulty',
        { difficulty: CourseDifficulty.INTERMEDIATE },
      );
    });

    it('should calculate correct skip for page 2', async () => {
      mockQueryBuilder.getManyAndCount!.mockResolvedValue([[], 0]);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
    });
  });

  describe('findById', () => {
    it('should return published course with relations', async () => {
      const course = {
        id: 'course-uuid',
        isPublished: true,
        tutorId: 'tutor-uuid',
      } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      const result = await service.findById('course-uuid');

      expect(result).toEqual(course);
      expect(courseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'course-uuid', isPublished: true },
        relations: ['tutor', 'lectures'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for unpublished course', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(service.findById('unpublished-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the course', async () => {
      const course = {
        id: 'course-uuid',
        tutorId: 'tutor-uuid',
        title: 'Old',
      } as Course;
      const updated = { ...course, title: 'New' } as Course;
      const dto: UpdateCourseDto = { title: 'New' };

      courseRepository.findOne!.mockResolvedValue(course);
      courseRepository.save!.mockResolvedValue(updated);

      const result = await service.update(
        'course-uuid',
        'tutor-uuid',
        Role.TUTOR,
        dto,
      );

      expect(result.title).toBe('New');
    });

    it('should throw ForbiddenException if not owner', async () => {
      const course = { id: 'course-uuid', tutorId: 'other-tutor' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.update('course-uuid', 'tutor-uuid', Role.TUTOR, {
          title: 'New',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to update any course', async () => {
      const course = {
        id: 'course-uuid',
        tutorId: 'other-tutor',
        title: 'Old',
      } as Course;
      const updated = { ...course, title: 'Admin Updated' } as Course;

      courseRepository.findOne!.mockResolvedValue(course);
      courseRepository.save!.mockResolvedValue(updated);

      const result = await service.update(
        'course-uuid',
        'admin-uuid',
        Role.ADMIN,
        { title: 'Admin Updated' },
      );

      expect(result.title).toBe('Admin Updated');
    });

    it('should throw NotFoundException if course not found', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'tutor-uuid', Role.TUTOR, {
          title: 'New',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove the course', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);
      courseRepository.remove!.mockResolvedValue(course);

      await service.remove('course-uuid', 'tutor-uuid', Role.TUTOR);

      expect(courseRepository.remove).toHaveBeenCalledWith(course);
    });

    it('should throw ForbiddenException if not owner', async () => {
      const course = { id: 'course-uuid', tutorId: 'other-tutor' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.remove('course-uuid', 'tutor-uuid', Role.TUTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to remove any course', async () => {
      const course = { id: 'course-uuid', tutorId: 'other-tutor' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);
      courseRepository.remove!.mockResolvedValue(course);

      await service.remove('course-uuid', 'admin-uuid', Role.ADMIN);

      expect(courseRepository.remove).toHaveBeenCalledWith(course);
    });

    it('should throw NotFoundException if course not found', async () => {
      courseRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', 'tutor-uuid', Role.TUTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Lecture CRUD ---

  describe('createLecture', () => {
    it('should create and return a lecture', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const dto: CreateLectureDto = {
        title: 'Lecture 1',
        content: 'Content',
        order: 1,
      };
      const lecture = {
        id: 'lecture-uuid',
        ...dto,
        courseId: 'course-uuid',
      } as Lecture;

      courseRepository.findOne!.mockResolvedValue(course);
      lectureRepository.create!.mockReturnValue(lecture);
      lectureRepository.save!.mockResolvedValue(lecture);

      const result = await service.createLecture(
        'course-uuid',
        'tutor-uuid',
        Role.TUTOR,
        dto,
      );

      expect(result).toEqual(lecture);
      expect(lectureRepository.create).toHaveBeenCalledWith({
        ...dto,
        courseId: 'course-uuid',
      });
    });

    it('should throw ForbiddenException if not course owner', async () => {
      const course = { id: 'course-uuid', tutorId: 'other-tutor' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.createLecture('course-uuid', 'tutor-uuid', Role.TUTOR, {
          title: 'Lecture 1',
          content: 'Content',
          order: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException on duplicate order', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const lecture = { id: 'lecture-uuid' } as Lecture;

      courseRepository.findOne!.mockResolvedValue(course);
      lectureRepository.create!.mockReturnValue(lecture);

      const driverError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      const queryError = new QueryFailedError(
        'INSERT INTO lectures',
        [],
        driverError,
      );
      lectureRepository.save!.mockRejectedValue(queryError);

      await expect(
        service.createLecture('course-uuid', 'tutor-uuid', Role.TUTOR, {
          title: 'Lecture',
          content: 'Content',
          order: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateLecture', () => {
    it('should update and return the lecture', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const lecture = {
        id: 'lecture-uuid',
        courseId: 'course-uuid',
        title: 'Old',
      } as Lecture;
      const updated = { ...lecture, title: 'New' } as Lecture;
      const dto: UpdateLectureDto = { title: 'New' };

      courseRepository.findOne!.mockResolvedValue(course);
      lectureRepository.findOne!.mockResolvedValue(lecture);
      lectureRepository.save!.mockResolvedValue(updated);

      const result = await service.updateLecture(
        'course-uuid',
        'lecture-uuid',
        'tutor-uuid',
        Role.TUTOR,
        dto,
      );

      expect(result.title).toBe('New');
    });

    it('should throw ForbiddenException if not course owner', async () => {
      const course = { id: 'course-uuid', tutorId: 'other-tutor' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.updateLecture(
          'course-uuid',
          'lecture-uuid',
          'tutor-uuid',
          Role.TUTOR,
          { title: 'New' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if lecture not found', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);
      lectureRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.updateLecture(
          'course-uuid',
          'nonexistent',
          'tutor-uuid',
          Role.TUTOR,
          { title: 'New' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeLecture', () => {
    it('should remove the lecture', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      const lecture = {
        id: 'lecture-uuid',
        courseId: 'course-uuid',
      } as Lecture;

      courseRepository.findOne!.mockResolvedValue(course);
      lectureRepository.findOne!.mockResolvedValue(lecture);
      lectureRepository.remove!.mockResolvedValue(lecture);

      await service.removeLecture(
        'course-uuid',
        'lecture-uuid',
        'tutor-uuid',
        Role.TUTOR,
      );

      expect(lectureRepository.remove).toHaveBeenCalledWith(lecture);
    });

    it('should throw ForbiddenException if not course owner', async () => {
      const course = { id: 'course-uuid', tutorId: 'other-tutor' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);

      await expect(
        service.removeLecture(
          'course-uuid',
          'lecture-uuid',
          'tutor-uuid',
          Role.TUTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if lecture not found', async () => {
      const course = { id: 'course-uuid', tutorId: 'tutor-uuid' } as Course;
      courseRepository.findOne!.mockResolvedValue(course);
      lectureRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.removeLecture(
          'course-uuid',
          'nonexistent',
          'tutor-uuid',
          Role.TUTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
