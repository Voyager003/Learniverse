import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '../common/enums/index.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@ApiTags('Assignments')
@ApiBearerAuth()
@Controller('courses/:cid/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR)
  @ApiOperation({ summary: '과제 생성 (TUTOR)' })
  @ApiResponse({
    status: 201,
    description: '생성 성공',
    type: AssignmentResponseDto,
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '강좌 없음' })
  async create(
    @Req() req: { user: RequestUser },
    @Param('cid', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsService.create(
      courseId,
      req.user.userId,
      dto,
    );
    return AssignmentResponseDto.from(assignment);
  }

  @Get()
  @ApiOperation({ summary: '강좌별 과제 조회' })
  @ApiResponse({
    status: 200,
    description: '과제 목록',
    type: [AssignmentResponseDto],
  })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '강좌 없음' })
  async findByCourse(
    @Req() req: { user: RequestUser },
    @Param('cid', ParseUUIDPipe) courseId: string,
  ): Promise<AssignmentResponseDto[]> {
    const assignments = await this.assignmentsService.findByCourse(
      courseId,
      req.user.userId,
      req.user.role,
    );
    return AssignmentResponseDto.fromMany(assignments);
  }
}
