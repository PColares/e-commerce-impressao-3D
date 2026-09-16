import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } };
  let jwt: { sign: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    prisma = { user: { findUnique: vi.fn(), create: vi.fn() } };
    jwt = { sign: vi.fn().mockReturnValue('signed-token') };
    service = new AuthService(prisma as unknown as PrismaService, jwt as unknown as JwtService);
  });

  describe('register', () => {
    it('cria o usuário e devolve token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Ana',
        role: 'CUSTOMER',
      });

      const result = await service.register({ email: 'a@b.com', password: 'senha1234', name: 'Ana' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toMatchObject({ id: 'u1', email: 'a@b.com', role: 'CUSTOMER' });
    });

    it('nunca guarda a senha em texto puro', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Ana', role: 'CUSTOMER' });

      await service.register({ email: 'a@b.com', password: 'senha1234', name: 'Ana' });

      const { data } = prisma.user.create.mock.calls[0]![0];
      expect(data.passwordHash).not.toBe('senha1234');
      expect(data).not.toHaveProperty('password');
      await expect(bcrypt.compare('senha1234', data.passwordHash)).resolves.toBe(true);
    });

    it('não devolve o hash da senha na resposta', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Ana', role: 'CUSTOMER' });

      const result = await service.register({ email: 'a@b.com', password: 'senha1234', name: 'Ana' });

      expect(JSON.stringify(result)).not.toContain('passwordHash');
    });

    it('recusa e-mail já cadastrado', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existente' });

      await expect(
        service.register({ email: 'a@b.com', password: 'senha1234', name: 'Ana' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('autentica com a senha correta', async () => {
      const passwordHash = await bcrypt.hash('senha1234', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Ana',
        role: 'CUSTOMER',
        passwordHash,
      });

      const result = await service.login({ email: 'a@b.com', password: 'senha1234' });

      expect(result.accessToken).toBe('signed-token');
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1' });
    });

    it('recusa senha errada', async () => {
      const passwordHash = await bcrypt.hash('senha1234', 10);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash });

      await expect(service.login({ email: 'a@b.com', password: 'errada' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('recusa e-mail inexistente sem revelar qual campo falhou', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'naoexiste@b.com', password: 'senha1234' }),
      ).rejects.toThrow('Credenciais inválidas.');
    });
  });
});
