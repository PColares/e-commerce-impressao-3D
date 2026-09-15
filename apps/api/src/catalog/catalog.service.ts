import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  materials() {
    return this.prisma.material.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
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
