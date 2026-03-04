import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { Course } from './entities/course.entity.js';
import { Lecture } from './entities/lecture.entity.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { LectureResponseDto } from './dto/lecture-response.dto.js';
import {
  CourseCategory,
  CourseDifficulty,
  Role,
} from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';

const mockTutor: User = {
  id: 'tutor-uuid',
  email: 'tutor@example.com',
  passwordHash: 'hashed',
  name: 'Tutor',
  role: Role.TUTOR,
  isActive: true,
  refreshToken: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockCourse: Course = {
  id: 'course-uuid',
  title: 'NestJS Fundamentals',
  description: 'Learn NestJS',
  category: CourseCategory.PROGRAMMING,
  difficulty: CourseDifficulty.BEGINNER,
  isPublished: true,
  tutorId: 'tutor-uuid',
  tutor: mockTutor,
  lectures: [],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
};

const mockLecture: Lecture = {
  id: 'lecture-uuid',
  title: 'Lecture 1',
  content: 'Content',
  videoUrl: null,
  order: 1,
  courseId: 'course-uuid',
  course: mockCourse,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('CoursesController', () => {
  let controller: CoursesController;
  let coursesService: Partial<Record<keyof CoursesService, jest.Mock>>;

  const mockReqTutor = {
    user: {
      userId: 'tutor-uuid',
      email: 'tutor@example.com',
      role: Role.TUTOR,
    },
  };

  beforeEach(async () => {
    coursesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findMyCourses: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createLecture: jest.fn(),
      updateLecture: jest.fn(),
      removeLecture: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [{ provide: CoursesService, useValue: coursesService }],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  // --- Course endpoints ---

  describe('POST /courses', () => {
    it('강좌를 생성하고 CourseResponseDto를 반환해야 한다', async () => {
      coursesService.create!.mockResolvedValue(mockCourse);

      const dto = {
        title: 'NestJS Fundamentals',
        description: 'Learn NestJS',
        category: CourseCategory.PROGRAMMING,
        difficulty: CourseDifficulty.BEGINNER,
      };

      const result = await controller.create(mockReqTutor, dto);

      expect(result).toBeInstanceOf(CourseResponseDto);
      expect(result.id).toBe('course-uuid');
      expect(result.tutorName).toBe('Tutor');
      expect(coursesService.create).toHaveBeenCalledWith('tutor-uuid', dto);
    });
  });

  describe('GET /courses', () => {
    it('페이지네이션된 CourseResponseDto 목록을 반환해야 한다', async () => {
      const paginated = new PaginatedResponseDto([mockCourse], 1, 1, 10);
      coursesService.findAll!.mockResolvedValue(paginated);

      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(result.data[0]).toBeInstanceOf(CourseResponseDto);
      expect(result.total).toBe(1);
      expect(coursesService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /courses/my', () => {
    it('튜터의 강좌 목록(공개/비공개 포함)을 페이지네이션으로 반환해야 한다', async () => {
      const unpublishedCourse = {
        ...mockCourse,
        id: 'course-2',
        isPublished: false,
      };
      const paginated = new PaginatedResponseDto(
        [mockCourse, unpublishedCourse],
        2,
        1,
        10,
      );
      coursesService.findMyCourses!.mockResolvedValue(paginated);

      const query = { page: 1, limit: 10 };
      const result = await controller.findMyCourses(mockReqTutor, query);

      expect(result.data[0]).toBeInstanceOf(CourseResponseDto);
      expect(result.data[1]).toBeInstanceOf(CourseResponseDto);
      expect(result.total).toBe(2);
      expect(coursesService.findMyCourses).toHaveBeenCalledWith(
        'tutor-uuid',
        query,
      );
    });
  });

  describe('GET /courses/:id', () => {
    it('lectures와 함께 CourseResponseDto를 반환해야 한다', async () => {
      const courseWithLectures = { ...mockCourse, lectures: [mockLecture] };
      coursesService.findById!.mockResolvedValue(courseWithLectures);

      const result = await controller.findOne('course-uuid');

      expect(result).toBeInstanceOf(CourseResponseDto);
      expect(result.id).toBe('course-uuid');
      expect(result.lectures).toHaveLength(1);
      expect(result.lectures![0]).toBeInstanceOf(LectureResponseDto);
    });

    it('NotFoundException을 전파해야 한다', async () => {
      coursesService.findById!.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /courses/:id', () => {
    it('강좌를 수정하고 CourseResponseDto를 반환해야 한다', async () => {
      const updated = { ...mockCourse, title: 'Updated' };
      coursesService.update!.mockResolvedValue(updated);

      const result = await controller.update(mockReqTutor, 'course-uuid', {
        title: 'Updated',
      });

      expect(result).toBeInstanceOf(CourseResponseDto);
      expect(result.title).toBe('Updated');
      expect(coursesService.update).toHaveBeenCalledWith(
        'course-uuid',
        'tutor-uuid',
        { title: 'Updated' },
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      coursesService.update!.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.update(mockReqTutor, 'course-uuid', { title: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DELETE /courses/:id', () => {
    it('remove를 호출하고 아무것도 반환하지 않아야 한다', async () => {
      coursesService.remove!.mockResolvedValue(undefined);

      await controller.remove(mockReqTutor, 'course-uuid');

      expect(coursesService.remove).toHaveBeenCalledWith(
        'course-uuid',
        'tutor-uuid',
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      coursesService.remove!.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.remove(mockReqTutor, 'course-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- Lecture endpoints ---

  describe('POST /courses/:id/lectures', () => {
    it('강의를 생성하고 LectureResponseDto를 반환해야 한다', async () => {
      coursesService.createLecture!.mockResolvedValue(mockLecture);

      const dto = { title: 'Lecture 1', content: 'Content', order: 1 };
      const result = await controller.createLecture(
        mockReqTutor,
        'course-uuid',
        dto,
      );

      expect(result).toBeInstanceOf(LectureResponseDto);
      expect(result.id).toBe('lecture-uuid');
      expect(coursesService.createLecture).toHaveBeenCalledWith(
        'course-uuid',
        'tutor-uuid',
        dto,
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      coursesService.createLecture!.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.createLecture(mockReqTutor, 'course-uuid', {
          title: 'x',
          content: 'x',
          order: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PATCH /courses/:id/lectures/:lid', () => {
    it('강의를 수정하고 LectureResponseDto를 반환해야 한다', async () => {
      const updated = { ...mockLecture, title: 'Updated' };
      coursesService.updateLecture!.mockResolvedValue(updated);

      const result = await controller.updateLecture(
        mockReqTutor,
        'course-uuid',
        'lecture-uuid',
        { title: 'Updated' },
      );

      expect(result).toBeInstanceOf(LectureResponseDto);
      expect(result.title).toBe('Updated');
      expect(coursesService.updateLecture).toHaveBeenCalledWith(
        'course-uuid',
        'lecture-uuid',
        'tutor-uuid',
        { title: 'Updated' },
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      coursesService.updateLecture!.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.updateLecture(mockReqTutor, 'course-uuid', 'lecture-uuid', {
          title: 'x',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DELETE /courses/:id/lectures/:lid', () => {
    it('removeLecture를 호출하고 아무것도 반환하지 않아야 한다', async () => {
      coursesService.removeLecture!.mockResolvedValue(undefined);

      await controller.removeLecture(
        mockReqTutor,
        'course-uuid',
        'lecture-uuid',
      );

      expect(coursesService.removeLecture).toHaveBeenCalledWith(
        'course-uuid',
        'lecture-uuid',
        'tutor-uuid',
      );
    });

    it('ForbiddenException을 전파해야 한다', async () => {
      coursesService.removeLecture!.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.removeLecture(mockReqTutor, 'course-uuid', 'lecture-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
