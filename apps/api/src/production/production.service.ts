import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PrintJobStatus } from '../generated/prisma/enums.js';
import { canMove, elapsedMinutes, isLate, maintenanceDue, printerStatus } from './production-rules.js';
import type {
  CreateJobDto,
  CreatePrinterDto,
  FailJobDto,
  SetSlotsDto,
  UpdateJobDto,
  UpdatePrinterDto,
} from './dto/production.dto.js';

export const CLOCK = 'PRODUCTION_CLOCK';

const STATUS_LABEL: Record<PrintJobStatus, string> = {
  QUEUED: 'na fila',
  PREPARING: 'em preparação',
  PRINTING: 'imprimindo',
  FINISHING: 'em acabamento',
  INSPECTION: 'em conferência',
  READY: 'pronto',
};

function translateUnique<T>(operation: Promise<T>): Promise<T> {
  return operation.catch((error: { code?: string }) => {
    if (error.code === 'P2002') throw new ConflictException('Já existe uma impressora com esse nome.');
    if (error.code === 'P2025') throw new NotFoundException('Impressora não encontrada.');
    throw error;
  });
}

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    // Injetável para os testes fixarem o "agora" (prazos e tempo impresso).
    @Optional() @Inject(CLOCK) private readonly now: () => Date = () => new Date(),
  ) {}

  // ─── Impressoras ────────────────────────────────────────────────────────

  async listPrinters() {
    const printers = await this.prisma.printer.findMany({
      orderBy: { name: 'asc' },
      include: {
        slots: {
          orderBy: { position: 'asc' },
          include: { material: { select: { id: true, name: true } }, color: { select: { id: true, name: true, hex: true } } },
        },
        jobs: { where: { status: 'PRINTING' }, select: { id: true, title: true, startedAt: true, estimatedMinutes: true } },
        _count: { select: { failures: true } },
      },
    });
    return printers.map(({ jobs, ...printer }) => ({
      ...printer,
      status: printerStatus(printer.manualStatus, jobs.length > 0),
      currentJob: jobs[0] ?? null,
      maintenanceDue: maintenanceDue(printer),
    }));
  }

  createPrinter(dto: CreatePrinterDto) {
    return translateUnique(this.prisma.printer.create({ data: dto }));
  }

  updatePrinter(id: string, dto: UpdatePrinterDto) {
    return translateUnique(this.prisma.printer.update({ where: { id }, data: dto }));
  }

  async deletePrinter(id: string) {
    const printing = await this.prisma.printJob.findFirst({ where: { printerId: id, status: 'PRINTING' } });
    if (printing) {
      throw new ConflictException(`A impressora está imprimindo "${printing.title}". Termine ou registre a falha antes.`);
    }
    // Jobs e falhas antigos ficam, só perdem a referência (onDelete: SetNull).
    await translateUnique(this.prisma.printer.delete({ where: { id } }));
  }

  // Zera o contador de horas até a próxima manutenção.
  async registerMaintenance(id: string) {
    const printer = await this.prisma.printer.findUnique({ where: { id } });
    if (!printer) throw new NotFoundException('Impressora não encontrada.');
    return this.prisma.printer.update({
      where: { id },
      data: { lastMaintenanceAt: this.now(), printedMinutesAtLastMaintenance: printer.printedMinutes },
    });
  }

  async setSlots(id: string, dto: SetSlotsDto) {
    const positions = dto.slots.map((slot) => slot.position);
    if (new Set(positions).size !== positions.length) {
      throw new BadRequestException('Cada posição só pode aparecer uma vez.');
    }
    const printer = await this.prisma.printer.findUnique({ where: { id } });
    if (!printer) throw new NotFoundException('Impressora não encontrada.');

    await this.prisma.$transaction([
      this.prisma.printerSlot.deleteMany({ where: { printerId: id } }),
      this.prisma.printerSlot.createMany({
        data: dto.slots.map((slot) => ({
          printerId: id,
          position: slot.position,
          materialId: slot.materialId ?? null,
          colorId: slot.colorId ?? null,
        })),
      }),
    ]);
  }

  // ─── Pedidos prontos para produzir ──────────────────────────────────────

  listOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        quote: {
          select: {
            fileName: true,
            quantity: true,
            material: { select: { name: true } },
            color: { select: { name: true, hex: true } },
            layerHeight: { select: { millimeters: true } },
          },
        },
        _count: { select: { printJobs: true } },
      },
    });
  }

  // ─── Jobs ───────────────────────────────────────────────────────────────

  async listJobs() {
    const jobs = await this.prisma.printJob.findMany({
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        printer: { select: { id: true, name: true } },
        order: {
          select: {
            id: true,
            user: { select: { name: true } },
            quote: {
              select: {
                fileName: true,
                quantity: true,
                material: { select: { name: true } },
                color: { select: { name: true, hex: true } },
                layerHeight: { select: { millimeters: true } },
              },
            },
          },
        },
        failures: { orderBy: { createdAt: 'desc' }, include: { printer: { select: { name: true } } } },
      },
    });
    const now = this.now();
    return jobs.map((job) => ({ ...job, late: isLate(job, now) }));
  }

  async createJob(dto: CreateJobDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { quote: { select: { fileName: true } } },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    return this.prisma.printJob.create({
      data: {
        orderId: order.id,
        title: dto.title ?? order.quote?.fileName ?? `Pedido ${order.id.slice(-6)}`,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        estimatedGrams: dto.estimatedGrams,
        notes: dto.notes,
      },
    });
  }

  async updateJob(id: string, dto: UpdateJobDto) {
    await this.findJob(id);
    const { dueDate, ...rest } = dto;
    return this.prisma.printJob.update({
      where: { id },
      data: { ...rest, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}) },
    });
  }

  async startJob(id: string, printerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.printJob.findUnique({ where: { id } });
      if (!job) throw new NotFoundException('Job não encontrado.');
      if (job.status !== 'QUEUED' && job.status !== 'PREPARING') {
        throw new BadRequestException(`Só dá para iniciar um job na fila ou em preparação (este está ${STATUS_LABEL[job.status]}).`);
      }

      const printer = await tx.printer.findUnique({ where: { id: printerId } });
      if (!printer) throw new NotFoundException('Impressora não encontrada.');
      if (printer.manualStatus !== 'ACTIVE') {
        const why = printer.manualStatus === 'MAINTENANCE' ? 'em manutenção' : 'offline';
        throw new ConflictException(`A impressora está ${why}.`);
      }
      const busy = await tx.printJob.findFirst({ where: { printerId, status: 'PRINTING' } });
      if (busy) throw new ConflictException(`A impressora já está imprimindo "${busy.title}".`);

      return tx.printJob.update({
        where: { id },
        data: { status: 'PRINTING', printerId, startedAt: this.now(), printedAt: null },
      });
    });
  }

  async finishPrint(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.printJob.findUnique({ where: { id } });
      if (!job) throw new NotFoundException('Job não encontrado.');
      if (job.status !== 'PRINTING') throw new BadRequestException('Este job não está imprimindo.');

      const now = this.now();
      if (job.printerId) {
        await tx.printer.update({
          where: { id: job.printerId },
          data: { printedMinutes: { increment: elapsedMinutes(job.startedAt, now) } },
        });
      }
      return tx.printJob.update({ where: { id }, data: { status: 'FINISHING', printedAt: now } });
    });
  }

  // Falha durante a impressão, ou descoberta no acabamento/conferência: o job
  // volta para a fila para ser reimpresso e a impressora fica livre.
  async failJob(id: string, dto: FailJobDto) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.printJob.findUnique({ where: { id } });
      if (!job) throw new NotFoundException('Job não encontrado.');
      if (!['PRINTING', 'FINISHING', 'INSPECTION'].includes(job.status)) {
        throw new BadRequestException('Só dá para registrar falha de um job que já foi impresso ou está imprimindo.');
      }

      await tx.printFailure.create({
        data: { jobId: id, printerId: job.printerId, reason: dto.reason, notes: dto.notes, wastedGrams: dto.wastedGrams },
      });
      // O tempo só é somado se a falha interrompeu uma impressão em andamento;
      // nas outras etapas ele já entrou quando a impressão terminou.
      if (job.status === 'PRINTING' && job.printerId) {
        await tx.printer.update({
          where: { id: job.printerId },
          data: { printedMinutes: { increment: elapsedMinutes(job.startedAt, this.now()) } },
        });
      }
      return tx.printJob.update({
        where: { id },
        data: { status: 'QUEUED', printerId: null, startedAt: null, printedAt: null },
      });
    });
  }

  async moveJob(id: string, status: PrintJobStatus) {
    const job = await this.findJob(id);
    if (!canMove(job.status, status)) {
      throw new BadRequestException(`Não dá para ir de "${STATUS_LABEL[job.status]}" para "${STATUS_LABEL[status]}".`);
    }
    return this.prisma.printJob.update({ where: { id }, data: { status } });
  }

  private async findJob(id: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job não encontrado.');
    return job;
  }
}
