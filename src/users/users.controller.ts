import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
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
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '../common/enums/index.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '전체 사용자 조회 (ADMIN)' })
  @ApiResponse({
    status: 200,
    description: '사용자 목록',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return UserResponseDto.fromMany(users);
  }

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, description: '내 정보', type: UserResponseDto })
  async getMe(@Req() req: { user: RequestUser }): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.userId);
    return UserResponseDto.from(user);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '사용자 상세 조회 (ADMIN)' })
  @ApiResponse({
    status: 200,
    description: '사용자 정보',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
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
