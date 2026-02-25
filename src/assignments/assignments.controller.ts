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
import { AssignmentsService } from './assignments.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Role } from '../common/enums/index.js';
import { RequestUser } from '../auth/interfaces/request-user.interface.js';

@Controller('courses/:cid/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  async create(
    @Req() req: { user: RequestUser },
    @Param('cid', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsService.create(
      courseId,
      req.user.userId,
      req.user.role,
      dto,
    );
    return AssignmentResponseDto.from(assignment);
  }

  @Get()
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
