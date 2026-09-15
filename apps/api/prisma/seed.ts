import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await Promise.all([
    prisma.material.upsert({
      where: { name: 'PLA' },
      update: {},
      create: { name: 'PLA', priceMultiplier: 1 },
    }),
    prisma.material.upsert({
      where: { name: 'PETG' },
      update: {},
      create: { name: 'PETG', priceMultiplier: 1.25 },
    }),
    prisma.material.upsert({
      where: { name: 'ABS' },
      update: {},
      create: { name: 'ABS', priceMultiplier: 1.35 },
    }),
    prisma.material.upsert({
      where: { name: 'RESINA' },
      update: {},
      create: { name: 'RESINA', priceMultiplier: 1.8 },
    }),
  ]);

  await Promise.all([
    prisma.layerHeight.upsert({
      where: { millimeters: 0.2 },
      update: {},
      create: { millimeters: 0.2, priceMultiplier: 1 },
    }),
    prisma.layerHeight.upsert({
      where: { millimeters: 0.12 },
      update: {},
      create: { millimeters: 0.12, priceMultiplier: 1.15 },
    }),
    prisma.layerHeight.upsert({
      where: { millimeters: 0.08 },
      update: {},
      create: { millimeters: 0.08, priceMultiplier: 1.35 },
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
