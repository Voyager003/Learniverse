import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, description: '내 정보', type: UserResponseDto })
  async getMe(@Req() req: { user: RequestUser }): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.userId);
    return UserResponseDto.from(user);
  }

  @Patch('me')
  @ApiOperation({ summary: '내 정보 수정' })
  @ApiResponse({ status: 200, description: '수정 성공', type: UserResponseDto })
  async updateMe(
    @Req() req: { user: RequestUser },
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(req.user.userId, dto);
    return UserResponseDto.from(user);
  }
}
