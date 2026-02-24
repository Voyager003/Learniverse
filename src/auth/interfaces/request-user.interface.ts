import { Role } from '../../common/enums/index.js';

export interface RequestUser {
  userId: string;
  email: string;
  role: Role;
}
