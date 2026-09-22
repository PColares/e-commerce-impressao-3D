import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminQuotesService } from './admin-quotes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { PrivateDiskStorage } from '../storage/private-disk.storage.js';

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
  let storage: { resolve: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = buildPrismaMock();
    storage = { resolve: vi.fn() };
    service = new AdminQuotesService(prisma as unknown as PrismaService, storage as unknown as PrivateDiskStorage);
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

  describe('baixar o arquivo', () => {
    it('devolve o caminho e o nome original do modelo', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'q1',
        fileName: 'suporte.stl',
        fileKey: 'models/3f2b8c1e-9d4a-4f6e-8b7a-1c2d3e4f5a6b.stl',
      });
      storage.resolve.mockReturnValue('/privado/models/3f2b8c1e-9d4a-4f6e-8b7a-1c2d3e4f5a6b.stl');

      await expect(service.file('q1')).resolves.toEqual({
        path: '/privado/models/3f2b8c1e-9d4a-4f6e-8b7a-1c2d3e4f5a6b.stl',
        fileName: 'suporte.stl',
      });
    });

    it('orçamento antigo, com URL provisória, dá 404 sem nem olhar o disco', async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: 'q1', fileName: 'x.stl', fileKey: 'blob:http://localhost/abc' });

      await expect(service.file('q1')).rejects.toThrow(/não está disponível/);
      expect(storage.resolve).not.toHaveBeenCalled();
    });

    it('arquivo que sumiu do disco (ex.: redeploy na Hostinger) dá 404', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'q1',
        fileName: 'x.stl',
        fileKey: 'models/3f2b8c1e-9d4a-4f6e-8b7a-1c2d3e4f5a6b.stl',
      });
      storage.resolve.mockReturnValue(null);

      await expect(service.file('q1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
