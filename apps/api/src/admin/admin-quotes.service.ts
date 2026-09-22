import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Aprovar um orçamento é o que cria o pedido. Pagamento e o resto do fluxo do
// pedido entram na etapa de pedidos/pagamento; aqui é só o necessário para a
// produção ter de onde partir.
@Injectable()
export class AdminQuotesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async reject(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Orçamento não encontrado.');
    if (quote.status !== 'PENDING') throw new BadRequestException('Só orçamentos pendentes podem ser recusados.');
    return this.prisma.quote.update({ where: { id }, data: { status: 'REJECTED' } });
  }
}
