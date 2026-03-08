import { Roles } from './roles.decorator.js';
import { Role } from '../enums/index.js';

export const AdminOnly = () => Roles(Role.ADMIN);
