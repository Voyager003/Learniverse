import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/index.js';

export class RegisterDto {
  private static readonly ALLOWED_ROLES = [Role.STUDENT, Role.TUTOR] as const;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    enum: RegisterDto.ALLOWED_ROLES,
    default: Role.STUDENT,
    description: '회원 역할 (student 또는 tutor)',
  })
  @IsOptional()
  @IsIn(RegisterDto.ALLOWED_ROLES)
  role?: Role;
}
