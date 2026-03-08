import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';
import { AdminOnly } from '../common/decorators/admin-only.decorator.js';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { UpdateAdminUserRoleDto } from './dto/update-admin-user-role.dto.js';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto.js';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@AdminOnly()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '관리자 사용자 목록 조회' })
  @ApiResponse({ status: 200, description: '사용자 목록' })
  async findAll(
    @Query() query: AdminUserQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const result = await this.adminUsersService.findAll(query);
    return new PaginatedResponseDto(
      UserResponseDto.fromMany(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '관리자 사용자 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '사용자 상세',
    type: UserResponseDto,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.adminUsersService.findById(id);
    return UserResponseDto.from(user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '관리자 사용자 상태 변경' })
  @ApiResponse({
    status: 200,
    description: '사용자 상태 변경',
    type: UserResponseDto,
  })
  async updateStatus(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserStatusDto,
  ): Promise<UserResponseDto> {
    const user = await this.adminUsersService.updateStatus(
      req.user.userId,
      id,
      dto,
    );
    return UserResponseDto.from(user);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: '관리자 사용자 역할 변경' })
  @ApiResponse({
    status: 200,
    description: '사용자 역할 변경',
    type: UserResponseDto,
  })
  async updateRole(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserRoleDto,
  ): Promise<UserResponseDto> {
    const user = await this.adminUsersService.updateRole(
      req.user.userId,
      id,
      dto,
    );
    return UserResponseDto.from(user);
  }

  @Delete(':id/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '관리자 사용자 세션 강제 해제' })
  @ApiResponse({ status: 204, description: '세션 강제 해제 성공' })
  async revokeSessions(
    @Req() req: { user: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.adminUsersService.revokeSessions(req.user.userId, id);
  }
}
