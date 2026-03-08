import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity.js';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index()
  @Column({ name: 'course_id' })
  courseId: string;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'is_published', default: true })
  isPublished: boolean = true;

  @Column({ name: 'is_admin_hidden', default: false })
  isAdminHidden: boolean = false;

  @Column({ name: 'admin_hidden_reason', type: 'text', nullable: true })
  adminHiddenReason: string | null = null;

  @Column({ name: 'admin_hidden_at', type: 'timestamp', nullable: true })
  adminHiddenAt: Date | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
