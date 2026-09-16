#!/usr/bin/env node
// Monta um app Node autocontido em deploy/, pronto para o upload no hPanel.
//
// Por que não dá para subir o repositório direto: ele é um monorepo pnpm e a
// Hostinger roda `npm install` na raiz do que for enviado — o protocolo
// "workspace:*" do @camada/shared faria o install falhar. Aqui o pacote
// compartilhado vai como dependência `file:`.

import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'deploy')

const run = (cmd) => {
  console.log(`\n$ ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

const step = (msg) => console.log(`\n=== ${msg} ===`)

step('build dos pacotes')
run('pnpm --filter @camada/shared build')
run('pnpm --filter web build-only')
run('pnpm --filter api build')

step('montando deploy/')
// Remove só o que este script gera. Apagar deploy/ inteiro dá EPERM no Windows
// quando node_modules tem binários em uso, e preservá-lo deixa o reinstall rápido.
// O package-lock.json entra na lista porque o package.json é regerado: um lock
// de uma geração anterior instalaria dependências erradas (foi o que aconteceu
// ao trocar o adapter de Postgres para MySQL).
for (const entry of [
  'dist',
  'public',
  'prisma',
  'vendor',
  'package.json',
  'package-lock.json',
  '.env.example',
  'LEIA-ME.md',
]) {
  rmSync(join(out, entry), { recursive: true, force: true })
}
mkdirSync(out, { recursive: true })

// API compilada
cpSync(join(root, 'apps/api/dist'), join(out, 'dist'), { recursive: true })

// Frontend: o ServeStaticModule serve esta pasta (ver apps/api/src/app.module.ts)
cpSync(join(root, 'apps/web/dist'), join(out, 'public'), { recursive: true })

// Schema e migrations, para rodar `prisma migrate deploy` contra o banco externo
cpSync(join(root, 'apps/api/prisma'), join(out, 'prisma'), { recursive: true })

// Pacote compartilhado como dependência file:
const sharedOut = join(out, 'vendor/shared')
mkdirSync(sharedOut, { recursive: true })
cpSync(join(root, 'packages/shared/dist'), join(sharedOut, 'dist'), { recursive: true })

const sharedPkg = JSON.parse(readFileSync(join(root, 'packages/shared/package.json'), 'utf8'))
writeFileSync(
  join(sharedOut, 'package.json'),
  JSON.stringify(
    {
      name: '@camada/shared',
      version: '0.0.0',
      type: 'module',
      main: './dist/index.js',
      types: './dist/index.d.ts',
      // Precisa declarar as deps próprias (zod), senão o npm não as instala e
      // o app quebra em runtime com ERR_MODULE_NOT_FOUND.
      dependencies: sharedPkg.dependencies ?? {},
    },
    null,
    2,
  ) + '\n',
)

step('gerando package.json de produção')
const apiPkg = JSON.parse(readFileSync(join(root, 'apps/api/package.json'), 'utf8'))
const deps = { ...apiPkg.dependencies, '@camada/shared': 'file:./vendor/shared' }

writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'camada',
      version: '0.0.0',
      private: true,
      type: 'module',
      // Permissivo de propósito: não sabemos qual Node exato a Hostinger usa,
      // e um engines restritivo faz o npm install falhar no servidor.
      engines: { node: '>=20' },
      scripts: {
        // O pacote já sobe compilado, mas os presets do hPanel executam um
        // comando de build. Sem um script "build" o deploy falha, então este
        // no-op existe só para esse passo passar.
        build: 'node -e "console.log(\'pacote já compilado — nada a fazer\')"',
        start: 'node dist/main.js',
      },
      dependencies: Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b))),
    },
    null,
    2,
  ) + '\n',
)

writeFileSync(
  join(out, '.env.example'),
  [
    '# MySQL criado no hPanel (Bancos de dados → MySQL). Ao colar no painel, sem aspas.',
    'DATABASE_URL="mysql://usuario:senha@host:3306/banco"',
    '# Gere um valor longo e aleatório; não reaproveite o de desenvolvimento',
    'JWT_SECRET="troque-por-um-segredo-forte"',
    '# A Hostinger normalmente injeta PORT; deixe o app respeitar essa variável',
    'PORT=3000',
    '',
  ].join('\n'),
)

writeFileSync(
  join(out, 'LEIA-ME.md'),
  `# Pacote de deploy — Camada

Gerado por \`pnpm deploy:bundle\`. Não edite à mão: rode o script de novo.

Conteúdo:

- \`dist/\` — API NestJS compilada (inclui o client do Prisma gerado)
- \`public/\` — build do Vue, servido pelo próprio Nest
- \`prisma/\` — schema e migrations
- \`vendor/shared/\` — pacote @camada/shared já compilado
- \`package.json\` — só dependências de produção, com \`npm start\`

## Como subir no hPanel

1. Compacte o **conteúdo** desta pasta em um .zip (não a pasta em si).
2. hPanel → o web app Node.js → **Faça upload dos arquivos**.
3. Configure as variáveis de ambiente do painel com base no \`.env.example\`
   (\`DATABASE_URL\`, \`JWT_SECRET\`). **Não** suba o \`.env\` no zip.
4. Comando de start: \`npm start\`.

## Banco de dados

Rode as migrations da sua máquina, apontando para o banco externo — assim não é
preciso o CLI do Prisma no servidor:

\`\`\`bash
cd apps/api
DATABASE_URL="<url-do-banco-de-producao>" pnpm exec prisma migrate deploy
DATABASE_URL="<url-do-banco-de-producao>" pnpm exec prisma db seed
\`\`\`
`,
)

step('pronto')
const size = existsSync(out)
console.log(`deploy/ montado: ${size}`)
console.log('Para compactar:  pnpm deploy:zip')
