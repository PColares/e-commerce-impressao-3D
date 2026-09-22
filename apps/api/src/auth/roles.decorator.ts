import { SetMetadata } from '@nestjs/common';
import type { AuthenticatedUser } from './current-user.decorator.js';

export const ROLES_KEY = 'roles';

// Usar junto com JwtAuthGuard e RolesGuard, nessa ordem: o RolesGuard lê o
// request.user que o JwtAuthGuard preencheu.
export const Roles = (...roles: AuthenticatedUser['role'][]) => SetMetadata(ROLES_KEY, roles);
