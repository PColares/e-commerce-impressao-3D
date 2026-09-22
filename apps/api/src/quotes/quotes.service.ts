import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { calculateQuotePrice } from '@crealio/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrivateDiskStorage } from '../storage/private-disk.storage.js';
import type { CreateQuoteDto } from './dto/create-quote.dto.js';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrivateDiskStorage,
  ) {}

  async create(userId: string, dto: CreateQuoteDto) {
    // A chave só é aceita se o upload aconteceu de fato neste servidor.
    if (!this.storage.resolve(dto.fileKey)) {
      throw new BadRequestException('Não encontramos o arquivo enviado. Envie o arquivo de novo.');
    }

    const [material, layerHeight, color] = await Promise.all([
      this.prisma.material.findUnique({ where: { id: dto.materialId } }),
      this.prisma.layerHeight.findUnique({ where: { id: dto.layerHeightId } }),
      this.prisma.color.findUnique({ where: { id: dto.colorId } }),
    ]);

    if (!material || !layerHeight || !color) {
      throw new BadRequestException('Material, altura de camada ou cor inválidos.');
    }

    const price = calculateQuotePrice(
      Number(material.priceMultiplier),
      Number(layerHeight.priceMultiplier),
      dto.quantity,
    );

    return this.prisma.quote.create({
      data: {
        userId,
        fileName: dto.fileName,
        fileKey: dto.fileKey,
        materialId: dto.materialId,
        layerHeightId: dto.layerHeightId,
        colorId: dto.colorId,
        quantity: dto.quantity,
        calculatedPrice: price.totalCard,
      },
      include: { material: true, layerHeight: true, color: true },
    });
  }

  // Inclui o pedido e o pagamento: é o que a página "Meus pedidos" mostra.
  findAllForUser(userId: string) {
    return this.prisma.quote.findMany({
      where: { userId },
      include: {
        material: true,
        layerHeight: true,
        color: true,
        order: { select: { id: true, status: true, totalPrice: true, payment: { select: { status: true, method: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, userId },
      include: { material: true, layerHeight: true, color: true },
    });
    if (!quote) {
      throw new NotFoundException('Orçamento não encontrado.');
    }
    return quote;
  }
}
