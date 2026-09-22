import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { calculateQuotePrice } from '@crealio/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateQuoteDto } from './dto/create-quote.dto.js';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateQuoteDto) {
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
        fileUrl: dto.fileUrl,
        materialId: dto.materialId,
        layerHeightId: dto.layerHeightId,
        colorId: dto.colorId,
        quantity: dto.quantity,
        calculatedPrice: price.totalCard,
      },
      include: { material: true, layerHeight: true, color: true },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.quote.findMany({
      where: { userId },
      include: { material: true, layerHeight: true, color: true },
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
