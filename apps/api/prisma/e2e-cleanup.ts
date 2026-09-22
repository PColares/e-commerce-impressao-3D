// Apaga o que a suíte E2E cria no banco local: usuários @e2e.com (e os
// orçamentos deles) e os itens de catálogo com nomes de teste. Roda no
// globalTeardown do Playwright.
//
// Só aceita banco em localhost/127.0.0.1: um DATABASE_URL de produção num
// terminal esquecido não pode virar faxina no banco de verdade.
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { unlink } from 'node:fs/promises';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrivateDiskStorage, resolvePrivateUploadDir } from '../src/storage/private-disk.storage.js';

const url = process.env.DATABASE_URL ?? '';
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
})();
if (!['localhost', '127.0.0.1'].includes(host)) {
  console.error(`e2e-cleanup: recusado, o banco não é local (host "${host || '?'}").`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

try {
  const testUsers = { user: { email: { endsWith: '@e2e.com' } } };
  // Ordem importa por causa das FKs: jobs (as falhas vão junto) → pedidos → orçamentos → usuários.
  await prisma.printJob.deleteMany({ where: { order: testUsers } });
  await prisma.order.deleteMany({ where: testUsers });
  await prisma.printer.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
  // Os modelos 3D enviados nos testes também saem do disco.
  const storage = new PrivateDiskStorage(resolvePrivateUploadDir());
  for (const { fileKey } of await prisma.quote.findMany({ where: testUsers, select: { fileKey: true } })) {
    const path = storage.resolve(fileKey);
    if (path) await unlink(path).catch(() => undefined);
  }
  const quotes = await prisma.quote.deleteMany({ where: testUsers });
  const users = await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.com' } } });
  const products = await prisma.product.deleteMany({
    where: { OR: [{ name: { startsWith: 'Peça E2E ' } }, { name: { startsWith: 'Excluível ' } }] },
  });
  // Só os que ficaram sem orçamento (os de teste acabaram de perder os seus).
  const materials = await prisma.material.deleteMany({
    where: { name: { startsWith: 'MatE2E' }, quotes: { none: {} } },
  });
  const colors = await prisma.color.deleteMany({
    where: { name: { startsWith: 'Areia E2E ' }, quotes: { none: {} } },
  });
  console.log(
    `e2e-cleanup: ${users.count} usuários, ${quotes.count} orçamentos, ${products.count} produtos, ` +
      `${materials.count} materiais, ${colors.count} cores removidos.`,
  );
} finally {
  await prisma.$disconnect();
}
