#!/usr/bin/env node
// Compacta o CONTEÚDO de deploy/ em camada-deploy.zip.
//
// Três cuidados, todos aprendidos na prática:
// - o zip precisa ter package.json na raiz; compactar a pasta em si faz a
//   Hostinger não encontrar o app;
// - node_modules NÃO vai no pacote (o servidor roda npm install, e binários
//   compilados aqui não servem lá), por isso a lista de itens é explícita;
// - os separadores das entradas precisam ser "/" e não "\". O Compress-Archive
//   do PowerShell grava com "\", que viola a spec do ZIP: em Linux os arquivos
//   aninhados viram nomes literais e o deploy quebra com ERR_MODULE_NOT_FOUND.
//   Por isso usamos o bsdtar (tar.exe do Windows), não o tar do Git Bash — esse
//   é o GNU tar, que trata "C:\..." como host remoto.

import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const deployDir = join(root, 'deploy')
const zipName = 'camada-deploy.zip'
const zipPath = join(root, zipName)

if (!existsSync(deployDir)) {
  console.error('deploy/ não existe. Rode antes: pnpm deploy:bundle')
  process.exit(1)
}

const entries = ['dist', 'public', 'prisma', 'vendor', 'package.json', 'LEIA-ME.md'].filter((entry) =>
  existsSync(join(deployDir, entry)),
)

rmSync(zipPath, { force: true })

const tarBin =
  process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar'

// Caminho de saída relativo: um caminho absoluto com "C:" confunde o tar.
execFileSync(tarBin, ['-a', '-c', '-f', join('..', zipName), ...entries], {
  cwd: deployDir,
  stdio: 'inherit',
})

// Verificação: se alguma entrada tiver "\", o pacote não serve para Linux.
const listing = execFileSync(tarBin, ['-t', '-f', zipPath], { encoding: 'utf8' })
const backslashed = listing.split('\n').filter((line) => line.includes('\\'))
if (backslashed.length > 0) {
  console.error('\nERRO: o zip saiu com separadores "\\" e vai falhar em Linux. Exemplos:')
  console.error(backslashed.slice(0, 3).join('\n'))
  process.exit(1)
}

const files = listing.split('\n').filter((line) => line.trim() && !line.endsWith('/'))
console.log(`\nzip pronto: ${zipPath}`)
console.log(`Itens: ${entries.join(', ')} (${files.length} arquivos)`)
console.log('Suba em hPanel → web app Node.js → Faça upload dos arquivos.')
