import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Documenta quais variáveis de ambiente são realmente obrigatórias para o app
// subir. Sem JWT_SECRET o AuthModule chama getOrThrow e o processo morre — foi
// o que derrubou o primeiro deploy na Hostinger, que só devolvia 503 sem pista.
// Se algum dia isso deixar de ser obrigatório, este teste avisa.

const API_ROOT = process.cwd();
const DIST_ENTRY = join(API_ROOT, 'dist', 'main.js');
const built = existsSync(DIST_ENTRY);

function bootWithout(variable: string): Promise<{ code: number | null; output: string }> {
  const env = { ...process.env, PORT: '3406', DATABASE_URL: 'mysql://x:y@127.0.0.1:59999/z' };
  delete env[variable];

  // cwd tem que ser um diretório sem .env: o ConfigModule carrega o .env do
  // cwd, então rodar de apps/api mascararia a variável ausente. Em produção
  // não existe .env — as variáveis vêm do painel.
  const isolatedCwd = mkdtempSync(join(tmpdir(), 'crealio-env-'));

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [DIST_ENTRY], { cwd: isolatedCwd, env });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));

    // Se continuar vivo, é porque a variável não é obrigatória.
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: null, output });
    }, 12_000);

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

describe.skipIf(!built)('variáveis de ambiente obrigatórias', () => {
  it('sem JWT_SECRET o processo morre e diz o motivo', async () => {
    const { code, output } = await bootWithout('JWT_SECRET');

    expect(code).not.toBeNull();
    expect(code).not.toBe(0);
    expect(output).toContain('JWT_SECRET');
  }, 20_000);
});
