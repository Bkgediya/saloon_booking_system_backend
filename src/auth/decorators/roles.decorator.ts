import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('BUSINESS_OWNER' | 'CUSTOMER')[]) =>
  SetMetadata(ROLES_KEY, roles);
