import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { slugify } from './slugify.js';
import type {
  CreateColorDto,
  CreateLayerHeightDto,
  CreateMaterialDto,
  CreateProductDto,
  UpdateColorDto,
  UpdateLayerHeightDto,
  UpdateMaterialDto,
  UpdateProductDto,
} from './dto/admin-catalog.dto.js';

// Traduz os erros do Prisma que o admin provoca com dados comuns (nome/slug
// repetido, id inexistente) em 409/404, em vez de deixar virar 500.
async function translate<T>(operation: Promise<T>, conflictMessage: string): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'P2002') throw new ConflictException(conflictMessage);
    if (code === 'P2025') throw new NotFoundException('Registro não encontrado.');
    throw error;
  }
}

// Sem delete: pedidos e orçamentos antigos referenciam esses registros, então
// "remover" é marcar active=false — some da vitrine e do configurador.
@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listProducts() {
    return this.prisma.product.findMany({ orderBy: [{ createdAt: 'desc' }, { name: 'asc' }] });
  }

  createProduct(dto: CreateProductDto) {
    const data = Object.assign({}, dto, { slug: dto.slug ?? slugify(dto.name) });
    return translate(this.prisma.product.create({ data }), 'Já existe um produto com esse slug.');
  }

  updateProduct(id: string, dto: UpdateProductDto) {
    return translate(this.prisma.product.update({ where: { id }, data: dto }), 'Já existe um produto com esse slug.');
  }

  listMaterials() {
    return this.prisma.material.findMany({ orderBy: { priceMultiplier: 'asc' } });
  }

  createMaterial(dto: CreateMaterialDto) {
    return translate(this.prisma.material.create({ data: dto }), 'Já existe um material com esse nome.');
  }

  updateMaterial(id: string, dto: UpdateMaterialDto) {
    return translate(this.prisma.material.update({ where: { id }, data: dto }), 'Já existe um material com esse nome.');
  }

  listColors() {
    return this.prisma.color.findMany({ orderBy: { name: 'asc' } });
  }

  createColor(dto: CreateColorDto) {
    return translate(this.prisma.color.create({ data: dto }), 'Já existe uma cor com esse nome.');
  }

  updateColor(id: string, dto: UpdateColorDto) {
    return translate(this.prisma.color.update({ where: { id }, data: dto }), 'Já existe uma cor com esse nome.');
  }

  listLayerHeights() {
    return this.prisma.layerHeight.findMany({ orderBy: { millimeters: 'desc' } });
  }

  createLayerHeight(dto: CreateLayerHeightDto) {
    return translate(this.prisma.layerHeight.create({ data: dto }), 'Essa altura de camada já existe.');
  }

  updateLayerHeight(id: string, dto: UpdateLayerHeightDto) {
    return translate(this.prisma.layerHeight.update({ where: { id }, data: dto }), 'Essa altura de camada já existe.');
  }
}
