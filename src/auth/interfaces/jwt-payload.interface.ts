import { Role } from '../../common/enums/index.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
