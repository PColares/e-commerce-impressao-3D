import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // Ordenado do mais barato para o mais caro: o configurador usa o primeiro
  // item como padrão e essa é a ordem dos chips no design (PLA, PETG, ABS, Resina).
  materials() {
    return this.prisma.material.findMany({
      where: { active: true },
      orderBy: { priceMultiplier: 'asc' },
    });
  }

  layerHeights() {
    return this.prisma.layerHeight.findMany({ where: { active: true }, orderBy: { millimeters: 'desc' } });
  }

  colors() {
    return this.prisma.color.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  products() {
    return this.prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  }
}
