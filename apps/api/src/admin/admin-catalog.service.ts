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

// Excluir só é permitido para o que nunca foi usado: pedidos e orçamentos
// antigos referenciam esses registros e perderiam o histórico. Para tirar de
// circulação algo já usado, o caminho é active=false (some da vitrine e do
// configurador).
function refuseIfUsed(count: number, singular: string, plural: string, what: string) {
  if (count === 0) return;
  const noun = count === 1 ? singular : plural;
  throw new ConflictException(
    `Não dá para excluir: ${what} aparece em ${count} ${noun}. Oculte em vez de excluir.`,
  );
}

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

  async deleteProduct(id: string) {
    refuseIfUsed(await this.prisma.orderItem.count({ where: { productId: id } }), 'pedido', 'pedidos', 'este produto');
    return translate(this.prisma.product.delete({ where: { id } }), '');
  }

  async deleteMaterial(id: string) {
    refuseIfUsed(await this.prisma.quote.count({ where: { materialId: id } }), 'orçamento', 'orçamentos', 'este material');
    return translate(this.prisma.material.delete({ where: { id } }), '');
  }

  async deleteColor(id: string) {
    refuseIfUsed(await this.prisma.quote.count({ where: { colorId: id } }), 'orçamento', 'orçamentos', 'esta cor');
    return translate(this.prisma.color.delete({ where: { id } }), '');
  }

  async deleteLayerHeight(id: string) {
    refuseIfUsed(
      await this.prisma.quote.count({ where: { layerHeightId: id } }),
      'orçamento',
      'orçamentos',
      'esta altura de camada',
    );
    return translate(this.prisma.layerHeight.delete({ where: { id } }), '');
  }
}
