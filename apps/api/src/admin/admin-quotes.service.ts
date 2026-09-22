import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MODEL_KEY_PATTERN } from '@crealio/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrivateDiskStorage } from '../storage/private-disk.storage.js';

// Aprovar um orçamento é o que cria o pedido. Pagamento e o resto do fluxo do
// pedido entram na etapa de pedidos/pagamento; aqui é só o necessário para a
// produção ter de onde partir.
@Injectable()
export class AdminQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrivateDiskStorage,
  ) {}

  list() {
    return this.prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        material: { select: { name: true } },
        color: { select: { name: true, hex: true } },
        layerHeight: { select: { millimeters: true } },
        order: { select: { id: true, status: true, _count: { select: { printJobs: true } } } },
      },
    });
  }

  async approve(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new NotFoundException('Orçamento não encontrado.');
      if (quote.status !== 'PENDING') throw new BadRequestException('Só orçamentos pendentes podem ser aprovados.');

      await tx.quote.update({ where: { id }, data: { status: 'APPROVED' } });
      return tx.order.create({
        data: { userId: quote.userId, quoteId: quote.id, totalPrice: quote.calculatedPrice },
      });
    });
  }

  // Caminho do modelo 3D do orçamento, para o admin baixar e fatiar.
  async file(id: string): Promise<{ path: string; fileName: string }> {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Orçamento não encontrado.');
    // Orçamentos de antes do upload real guardavam uma URL provisória do navegador.
    const path = MODEL_KEY_PATTERN.test(quote.fileKey) ? this.storage.resolve(quote.fileKey) : null;
    if (!path) throw new NotFoundException('O arquivo deste orçamento não está disponível no servidor.');
    return { path, fileName: quote.fileName };
  }

  async reject(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Orçamento não encontrado.');
    if (quote.status !== 'PENDING') throw new BadRequestException('Só orçamentos pendentes podem ser recusados.');
    return this.prisma.quote.update({ where: { id }, data: { status: 'REJECTED' } });
  }
}
