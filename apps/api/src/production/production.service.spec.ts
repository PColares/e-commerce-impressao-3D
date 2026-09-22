import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProductionService } from './production.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function buildPrismaMock() {
  const prisma = {
    order: { findUnique: vi.fn() },
    printJob: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    printer: { findUnique: vi.fn(), update: vi.fn() },
    printFailure: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  // Transação interativa: o callback recebe o próprio mock.
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.printJob.update.mockImplementation(({ data }: { data: object }) => ({ id: 'j1', ...data }));
  return prisma;
}

const NOW = new Date('2026-09-22T12:00:00Z');

describe('ProductionService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ProductionService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProductionService(prisma as unknown as PrismaService, () => NOW);
  });

  describe('mandar para produção', () => {
    it('cria o job na fila com o nome do arquivo do orçamento como título', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', quote: { fileName: 'engrenagem.stl' } });

      await service.createJob({ orderId: 'o1' });

      const { data } = prisma.printJob.create.mock.calls[0]![0];
      expect(data).toMatchObject({ orderId: 'o1', title: 'engrenagem.stl' });
    });

    it('pedido inexistente vira 404', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.createJob({ orderId: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('iniciar impressão', () => {
    beforeEach(() => {
      prisma.printJob.findUnique.mockResolvedValue({ id: 'j1', status: 'QUEUED' });
      prisma.printer.findUnique.mockResolvedValue({ id: 'p1', manualStatus: 'ACTIVE' });
      prisma.printJob.findFirst.mockResolvedValue(null);
    });

    it('coloca o job na impressora e marca o início', async () => {
      await service.startJob('j1', 'p1');

      expect(prisma.printJob.update).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: { status: 'PRINTING', printerId: 'p1', startedAt: NOW, printedAt: null },
      });
    });

    it('recusa impressora que já está imprimindo outro job', async () => {
      prisma.printJob.findFirst.mockResolvedValue({ id: 'outro', title: 'Vaso' });

      await expect(service.startJob('j1', 'p1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.printJob.update).not.toHaveBeenCalled();
    });

    it('recusa impressora em manutenção', async () => {
      prisma.printer.findUnique.mockResolvedValue({ id: 'p1', manualStatus: 'MAINTENANCE' });

      await expect(service.startJob('j1', 'p1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('só inicia job que está na fila ou em preparação', async () => {
      prisma.printJob.findUnique.mockResolvedValue({ id: 'j1', status: 'READY' });

      await expect(service.startJob('j1', 'p1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('terminar impressão', () => {
    it('vai para acabamento e soma o tempo impresso na impressora', async () => {
      prisma.printJob.findUnique.mockResolvedValue({
        id: 'j1',
        status: 'PRINTING',
        printerId: 'p1',
        startedAt: new Date('2026-09-22T09:30:00Z'),
      });

      await service.finishPrint('j1');

      expect(prisma.printJob.update).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: { status: 'FINISHING', printedAt: NOW },
      });
      expect(prisma.printer.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { printedMinutes: { increment: 150 } },
      });
    });

    it('recusa se o job não está imprimindo', async () => {
      prisma.printJob.findUnique.mockResolvedValue({ id: 'j1', status: 'QUEUED' });

      await expect(service.finishPrint('j1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('registrar falha', () => {
    it('registra o motivo, soma o tempo gasto e devolve o job para a fila sem impressora', async () => {
      prisma.printJob.findUnique.mockResolvedValue({
        id: 'j1',
        status: 'PRINTING',
        printerId: 'p1',
        startedAt: new Date('2026-09-22T11:00:00Z'),
      });

      await service.failJob('j1', { reason: 'SPAGHETTI', notes: 'soltou da mesa', wastedGrams: 35 });

      expect(prisma.printFailure.create).toHaveBeenCalledWith({
        data: { jobId: 'j1', printerId: 'p1', reason: 'SPAGHETTI', notes: 'soltou da mesa', wastedGrams: 35 },
      });
      expect(prisma.printer.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { printedMinutes: { increment: 60 } },
      });
      expect(prisma.printJob.update).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: { status: 'QUEUED', printerId: null, startedAt: null, printedAt: null },
      });
    });

    it('falha achada na conferência também reimprime, sem somar tempo de novo', async () => {
      prisma.printJob.findUnique.mockResolvedValue({ id: 'j1', status: 'INSPECTION', printerId: 'p1', startedAt: null });

      await service.failJob('j1', { reason: 'LAYER_SHIFT' });

      expect(prisma.printer.update).not.toHaveBeenCalled();
      expect(prisma.printJob.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'QUEUED' }) }),
      );
    });

    it('não registra falha de job que ainda nem foi impresso', async () => {
      prisma.printJob.findUnique.mockResolvedValue({ id: 'j1', status: 'QUEUED' });

      await expect(service.failJob('j1', { reason: 'OTHER' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('mover entre colunas', () => {
    it('aceita movimento permitido', async () => {
      prisma.printJob.findUnique.mockResolvedValue({ id: 'j1', status: 'INSPECTION' });

      await service.moveJob('j1', 'READY');

      expect(prisma.printJob.update).toHaveBeenCalledWith({ where: { id: 'j1' }, data: { status: 'READY' } });
    });

    it('recusa pular etapas', async () => {
      prisma.printJob.findUnique.mockResolvedValue({ id: 'j1', status: 'QUEUED' });

      await expect(service.moveJob('j1', 'READY')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
