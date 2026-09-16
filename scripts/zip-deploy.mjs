#!/usr/bin/env node
// Compacta o CONTEÚDO de deploy/ em camada-deploy.zip.
//
// Dois cuidados:
// - o zip precisa ter package.json na raiz; compactar a pasta em si faz a
//   Hostinger não encontrar o app;
// - node_modules NÃO vai no pacote (o servidor roda npm install, e binários
//   compilados aqui não servem lá), por isso a lista de itens é explícita.

import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const deployDir = join(root, 'deploy')
const zipPath = join(root, 'camada-deploy.zip')

if (!existsSync(deployDir)) {
  console.error('deploy/ não existe. Rode antes: pnpm deploy:bundle')
  process.exit(1)
}

const entries = ['dist', 'public', 'prisma', 'vendor', 'package.json', 'LEIA-ME.md'].filter((entry) =>
  existsSync(join(deployDir, entry)),
)

rmSync(zipPath, { force: true })

if (process.platform === 'win32') {
  // O tar do Git Bash é GNU tar e trata "C:\..." como host remoto; o
  // Compress-Archive do PowerShell é nativo e não tem esse problema.
  const paths = entries.map((entry) => `'${join(deployDir, entry)}'`).join(',')
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `Compress-Archive -Path ${paths} -DestinationPath '${zipPath}' -Force`],
    { stdio: 'inherit' },
  )
} else {
  execFileSync('zip', ['-r', '-q', zipPath, ...entries], { cwd: deployDir, stdio: 'inherit' })
}

console.log(`\nzip pronto: ${zipPath}`)
console.log('Conteúdo:', entries.join(', '))
console.log('Suba em hPanel → web app Node.js → Faça upload dos arquivos.')
