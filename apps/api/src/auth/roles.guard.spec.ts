import { describe, it, expect } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY } from './roles.decorator.js';

function contextFor(user: unknown, roles?: string[]): { ctx: ExecutionContext; reflector: Reflector } {
  const handler = () => undefined;
  const reflector = new Reflector();
  if (roles) {
    Reflect.defineMetadata(ROLES_KEY, roles, handler);
  }
  const ctx = {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return { ctx, reflector };
}

describe('RolesGuard', () => {
  it('libera rotas sem @Roles', () => {
    const { ctx, reflector } = contextFor({ role: 'CUSTOMER' });
    expect(new RolesGuard(reflector).canActivate(ctx)).toBe(true);
  });

  it('libera o admin numa rota de admin', () => {
    const { ctx, reflector } = contextFor({ role: 'ADMIN' }, ['ADMIN']);
    expect(new RolesGuard(reflector).canActivate(ctx)).toBe(true);
  });

  it('barra o cliente numa rota de admin com 403', () => {
    const { ctx, reflector } = contextFor({ role: 'CUSTOMER' }, ['ADMIN']);
    expect(() => new RolesGuard(reflector).canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('barra quando não há usuário autenticado', () => {
    const { ctx, reflector } = contextFor(undefined, ['ADMIN']);
    expect(() => new RolesGuard(reflector).canActivate(ctx)).toThrow(ForbiddenException);
  });
});
