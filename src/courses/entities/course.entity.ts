import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CourseCategory, CourseDifficulty } from '../../common/enums/index.js';
import { User } from '../../users/entities/user.entity.js';
import { Lecture } from './lecture.entity.js';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: CourseCategory })
  category: CourseCategory;

  @Column({ type: 'enum', enum: CourseDifficulty })
  difficulty: CourseDifficulty;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean = false;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tutor_id' })
  tutor: User;

  @Column({ name: 'tutor_id' })
  tutorId: string;

  @OneToMany(() => Lecture, (lecture) => lecture.course)
  lectures: Lecture[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
