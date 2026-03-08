import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/index.js';

export class AdminRegisterResponseDto {
  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ enum: [Role.ADMIN], example: Role.ADMIN })
  role: Role.ADMIN;
}
