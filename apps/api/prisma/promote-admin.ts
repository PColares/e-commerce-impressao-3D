// Promove um usuário já cadastrado a ADMIN. Não existe cadastro de admin pelo
// site de propósito: quem vira admin é decidido aqui, com acesso ao banco.
//
//   pnpm --filter api admin:promote voce@email.com
//
// Na Hostinger, sem acesso remoto ao MySQL, o equivalente é rodar no phpMyAdmin:
//   UPDATE `User` SET `role` = 'ADMIN' WHERE `email` = 'voce@email.com';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const email = process.argv[2];
if (!email) {
  console.error('Uso: pnpm --filter api admin:promote <email>');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL ?? ''),
});

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Nenhum usuário com o e-mail ${email}. Cadastre-se no site primeiro.`);
    process.exitCode = 1;
  } else if (user.role === 'ADMIN') {
    console.log(`${email} já é admin.`);
  } else {
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    console.log(`${email} agora é admin. Saia e entre de novo no site para o painel aparecer.`);
  }
} finally {
  await prisma.$disconnect();
}
