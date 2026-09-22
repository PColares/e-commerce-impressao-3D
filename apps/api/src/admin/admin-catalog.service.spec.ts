import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminCatalogService } from './admin-catalog.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function delegate() {
  return { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

function buildPrismaMock() {
  return {
    product: delegate(),
    material: delegate(),
    color: delegate(),
    layerHeight: delegate(),
    quote: { count: vi.fn().mockResolvedValue(0) },
    orderItem: { count: vi.fn().mockResolvedValue(0) },
  };
}

// Erros do Prisma chegam com `code`; o serviço traduz os dois que importam.
const uniqueViolation = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
const recordNotFound = Object.assign(new Error('Record not found'), { code: 'P2025' });

describe('AdminCatalogService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AdminCatalogService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AdminCatalogService(prisma as unknown as PrismaService);
    for (const model of [prisma.product, prisma.material, prisma.color, prisma.layerHeight]) {
      model.create.mockImplementation(({ data }: { data: object }) => ({ id: 'novo', ...data }));
      model.update.mockImplementation(({ data }: { data: object }) => ({ id: 'x', ...data }));
    }
  });

  describe('produtos', () => {
    it('lista também os inativos, que a vitrine esconde', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.listProducts();

      const args = prisma.product.findMany.mock.calls[0]![0] ?? {};
      expect(args.where).toBeUndefined();
    });

    it('gera o slug a partir do nome quando não vem um', async () => {
      await service.createProduct({ name: 'Vaso Geométrico', description: 'd', basePrice: 50 });

      const { data } = prisma.product.create.mock.calls[0]![0];
      expect(data.slug).toBe('vaso-geometrico');
    });

    it('respeita o slug informado', async () => {
      await service.createProduct({ name: 'Vaso', slug: 'vaso-especial', description: 'd', basePrice: 50 });

      const { data } = prisma.product.create.mock.calls[0]![0];
      expect(data.slug).toBe('vaso-especial');
    });

    it('slug repetido vira 409, não 500', async () => {
      prisma.product.create.mockRejectedValue(uniqueViolation);

      await expect(
        service.createProduct({ name: 'Vaso', description: 'd', basePrice: 50 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('editar produto inexistente vira 404', async () => {
      prisma.product.update.mockRejectedValue(recordNotFound);

      await expect(service.updateProduct('nao-existe', { basePrice: 10 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('desativar é só uma edição de active, sem apagar (pedidos antigos referenciam o produto)', async () => {
      await service.updateProduct('p1', { active: false });

      expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { active: false } });
    });
  });

  describe('materiais, cores e alturas de camada', () => {
    it('material com nome repetido vira 409', async () => {
      prisma.material.create.mockRejectedValue(uniqueViolation);

      await expect(service.createMaterial({ name: 'PLA', priceMultiplier: 1 })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('cria cor', async () => {
      await service.createColor({ name: 'Azul', hex: '#1E40AF' });

      expect(prisma.color.create).toHaveBeenCalledWith({ data: { name: 'Azul', hex: '#1E40AF' } });
    });

    it('edita altura de camada inexistente vira 404', async () => {
      prisma.layerHeight.update.mockRejectedValue(recordNotFound);

      await expect(service.updateLayerHeight('x', { priceMultiplier: 2 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lista materiais do mais barato para o mais caro, incluindo inativos', async () => {
      prisma.material.findMany.mockResolvedValue([]);

      await service.listMaterials();

      expect(prisma.material.findMany).toHaveBeenCalledWith({ orderBy: { priceMultiplier: 'asc' } });
    });
  });

  describe('excluir', () => {
    it('exclui produto que nunca foi pedido', async () => {
      await service.deleteProduct('p1');

      expect(prisma.orderItem.count).toHaveBeenCalledWith({ where: { productId: 'p1' } });
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('recusa excluir produto que está em pedidos, com 409 explicando o que fazer', async () => {
      prisma.orderItem.count.mockResolvedValue(2);

      const attempt = service.deleteProduct('p1');

      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow(/2 pedidos.*ocult/i);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('recusa excluir material usado em orçamentos', async () => {
      prisma.quote.count.mockResolvedValue(1);

      await expect(service.deleteMaterial('m1')).rejects.toThrow(/aparece em 1 orçamento\./);
      expect(prisma.quote.count).toHaveBeenCalledWith({ where: { materialId: 'm1' } });
      expect(prisma.material.delete).not.toHaveBeenCalled();
    });

    it('exclui cor e altura de camada sem uso', async () => {
      await service.deleteColor('c1');
      await service.deleteLayerHeight('l1');

      expect(prisma.quote.count).toHaveBeenCalledWith({ where: { colorId: 'c1' } });
      expect(prisma.quote.count).toHaveBeenCalledWith({ where: { layerHeightId: 'l1' } });
      expect(prisma.color.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(prisma.layerHeight.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
    });

    it('excluir id inexistente vira 404', async () => {
      prisma.color.delete.mockRejectedValue(recordNotFound);

      await expect(service.deleteColor('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
