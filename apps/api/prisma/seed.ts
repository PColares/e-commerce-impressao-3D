import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Renomeia o registro antigo em vez de criar um novo, preservando as FKs dos orçamentos.
  await prisma.material.updateMany({ where: { name: 'RESINA' }, data: { name: 'Resina' } });

  await Promise.all([
    prisma.material.upsert({
      where: { name: 'PLA' },
      update: { priceMultiplier: 1 },
      create: { name: 'PLA', priceMultiplier: 1 },
    }),
    prisma.material.upsert({
      where: { name: 'PETG' },
      update: { priceMultiplier: 1.25 },
      create: { name: 'PETG', priceMultiplier: 1.25 },
    }),
    prisma.material.upsert({
      where: { name: 'ABS' },
      update: { priceMultiplier: 1.35 },
      create: { name: 'ABS', priceMultiplier: 1.35 },
    }),
    prisma.material.upsert({
      where: { name: 'Resina' },
      update: { priceMultiplier: 1.8 },
      create: { name: 'Resina', priceMultiplier: 1.8 },
    }),
  ]);

  await Promise.all([
    prisma.layerHeight.upsert({
      where: { millimeters: 0.2 },
      update: { priceMultiplier: 0.85 },
      create: { millimeters: 0.2, priceMultiplier: 0.85 },
    }),
    prisma.layerHeight.upsert({
      where: { millimeters: 0.12 },
      update: { priceMultiplier: 1 },
      create: { millimeters: 0.12, priceMultiplier: 1 },
    }),
    prisma.layerHeight.upsert({
      where: { millimeters: 0.08 },
      update: { priceMultiplier: 1.4 },
      create: { millimeters: 0.08, priceMultiplier: 1.4 },
    }),
  ]);

  await Promise.all([
    prisma.color.upsert({
      where: { name: 'Branco' },
      update: {},
      create: { name: 'Branco', hex: '#F5F5F0' },
    }),
    prisma.color.upsert({
      where: { name: 'Preto' },
      update: {},
      create: { name: 'Preto', hex: '#1A1A1A' },
    }),
    prisma.color.upsert({
      where: { name: 'Cinza' },
      update: {},
      create: { name: 'Cinza', hex: '#8A8A8A' },
    }),
    prisma.color.upsert({
      where: { name: 'Cobre' },
      update: {},
      create: { name: 'Cobre', hex: '#B5651D' },
    }),
    prisma.color.upsert({
      where: { name: 'Verde-oliva' },
      update: {},
      create: { name: 'Verde-oliva', hex: '#6E7C4A' },
    }),
  ]);

  await Promise.all([
    prisma.product.upsert({
      where: { slug: 'braco-articulado' },
      update: {},
      create: {
        name: 'Braço articulado',
        slug: 'braco-articulado',
        description: 'Braço articulado impresso sob demanda, ideal para suportes e protótipos móveis.',
        imageUrl: '/products/peca-braco-articulado.jpg',
        basePrice: 89,
        material: 'PETG',
        layerHeightLabel: '0.20mm',
        specSheet: '12 cm · 48 g · preenchimento 20%',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'suporte-relogio' },
      update: {},
      create: {
        name: 'Suporte de relógio',
        slug: 'suporte-relogio',
        description: 'Suporte de precisão em resina para relógios e acessórios.',
        imageUrl: '/products/peca-suporte-relogio.jpg',
        basePrice: 142,
        material: 'Resina',
        layerHeightLabel: '0.08mm',
        specSheet: '9 cm · 64 g · alta precisão',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'suporte-fone' },
      update: {},
      create: {
        name: 'Suporte de fone',
        slug: 'suporte-fone',
        description: 'Suporte resistente em ABS para fones de ouvido de mesa.',
        imageUrl: '/products/peca-suporte-fone.jpg',
        basePrice: 118,
        material: 'ABS',
        layerHeightLabel: '0.20mm',
        specSheet: '22 cm · 96 g · resistência térmica',
      },
    }),
  ]);

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
