import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuotesService } from './quotes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function buildPrismaMock() {
  return {
    material: { findUnique: vi.fn() },
    layerHeight: { findUnique: vi.fn() },
    color: { findUnique: vi.fn() },
    quote: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  };
}

const dto = {
  fileName: 'peca.stl',
  fileUrl: 'https://storage.example.com/peca.stl',
  materialId: 'mat-pla',
  layerHeightId: 'lh-012',
  colorId: 'col-preto',
  quantity: 3,
};

describe('QuotesService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: QuotesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new QuotesService(prisma as unknown as PrismaService);

    prisma.material.findUnique.mockResolvedValue({ id: 'mat-pla', priceMultiplier: '1' });
    prisma.layerHeight.findUnique.mockResolvedValue({ id: 'lh-012', priceMultiplier: '1' });
    prisma.color.findUnique.mockResolvedValue({ id: 'col-preto', hex: '#1A1A1A' });
    prisma.quote.create.mockImplementation(({ data }: { data: unknown }) => ({ id: 'q1', ...(data as object) }));
  });

  describe('create', () => {
    it('persiste o preço calculado no servidor, não um preço vindo do cliente', async () => {
      await service.create('user-1', dto);

      expect(prisma.quote.create).toHaveBeenCalledTimes(1);
      const { data } = prisma.quote.create.mock.calls[0]![0];
      // PLA (x1) x camada (x1) x 3 x R$58
      expect(data.calculatedPrice).toBe(174);
    });

    it('aplica os multiplicadores de material e camada', async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 'mat-resina', priceMultiplier: '1.8' });
      prisma.layerHeight.findUnique.mockResolvedValue({ id: 'lh-008', priceMultiplier: '1.4' });

      await service.create('user-1', { ...dto, quantity: 2 });

      const { data } = prisma.quote.create.mock.calls[0]![0];
      expect(data.calculatedPrice).toBe(292.32);
    });

    it('vincula o orçamento ao usuário autenticado', async () => {
      await service.create('user-42', dto);

      const { data } = prisma.quote.create.mock.calls[0]![0];
      expect(data.userId).toBe('user-42');
    });

    it('rejeita material inexistente', async () => {
      prisma.material.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.quote.create).not.toHaveBeenCalled();
    });

    it('rejeita altura de camada inexistente', async () => {
      prisma.layerHeight.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.quote.create).not.toHaveBeenCalled();
    });

    it('rejeita cor inexistente', async () => {
      prisma.color.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.quote.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('filtra somente os orçamentos do próprio usuário', () => {
      prisma.quote.findMany.mockResolvedValue([]);

      service.findAllForUser('user-7');

      expect(prisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-7' } }),
      );
    });
  });

  describe('findOneForUser', () => {
    it('não devolve orçamento de outro usuário', async () => {
      prisma.quote.findFirst.mockResolvedValue(null);

      await expect(service.findOneForUser('user-1', 'q-de-outro')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('busca sempre restringindo pelo userId', async () => {
      prisma.quote.findFirst.mockResolvedValue({ id: 'q1' });

      await service.findOneForUser('user-1', 'q1');

      expect(prisma.quote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'q1', userId: 'user-1' } }),
      );
    });
  });
});
