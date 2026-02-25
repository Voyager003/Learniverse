import { PartialType } from '@nestjs/swagger';
import { CreateAssignmentDto } from './create-assignment.dto.js';

export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}
