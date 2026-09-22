import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminQuotesService } from './admin-quotes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function buildPrismaMock() {
  const prisma = {
    quote: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    order: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return prisma;
}

describe('AdminQuotesService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AdminQuotesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AdminQuotesService(prisma as unknown as PrismaService);
  });

  it('aprovar cria o pedido do cliente com o preço calculado do orçamento', async () => {
    prisma.quote.findUnique.mockResolvedValue({ id: 'q1', status: 'PENDING', userId: 'u1', calculatedPrice: '174' });

    await service.approve('q1');

    expect(prisma.quote.update).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { status: 'APPROVED' } });
    expect(prisma.order.create).toHaveBeenCalledWith({
      data: { userId: 'u1', quoteId: 'q1', totalPrice: '174' },
    });
  });

  it('não aprova duas vezes', async () => {
    prisma.quote.findUnique.mockResolvedValue({ id: 'q1', status: 'APPROVED' });

    await expect(service.approve('q1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('recusar só vale para orçamento pendente', async () => {
    prisma.quote.findUnique.mockResolvedValue({ id: 'q1', status: 'PENDING' });
    await service.reject('q1');
    expect(prisma.quote.update).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { status: 'REJECTED' } });

    prisma.quote.findUnique.mockResolvedValue({ id: 'q1', status: 'APPROVED' });
    await expect(service.reject('q1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('orçamento inexistente vira 404', async () => {
    prisma.quote.findUnique.mockResolvedValue(null);

    await expect(service.approve('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
