import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// O app não pode se recusar a subir porque o banco está fora do ar.
//
// Motivo prático: em hospedagem gerenciada com Postgres serverless (Neon
// suspende por inatividade), uma conexão indisponível no boot viraria
// crash-loop e o site inteiro cai com 503 — inclusive as páginas que nem
// tocam no banco. O front deve continuar sendo servido; só as rotas de dados
// falham, e voltam sozinhas quando o banco responde.

const API_ROOT = process.cwd();
const DIST_ENTRY = join(API_ROOT, 'dist', 'main.js');
const SPA_DIR = join(API_ROOT, 'test', '__spa-boot-fixture__');
const PORT = 3405;
const BASE = `http://localhost:${PORT}`;

const built = existsSync(DIST_ENTRY);

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE}/api`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
}

describe.skipIf(!built)('boot com banco inacessível', () => {
  let server: ChildProcess;
  let cameUp: boolean;

  beforeAll(async () => {
    mkdirSync(SPA_DIR, { recursive: true });
    writeFileSync(join(SPA_DIR, 'index.html'), '<!doctype html><title>Crealio SPA</title>');

    server = spawn(process.execPath, [DIST_ENTRY], {
      cwd: API_ROOT,
      env: {
        ...process.env,
        PORT: String(PORT),
        SPA_DIR,
        // Porta onde não há banco nenhum
        DATABASE_URL: 'mysql://ninguem:nada@127.0.0.1:59999/vazio',
        JWT_SECRET: 'teste-boot',
      },
      stdio: 'ignore',
    });

    cameUp = await waitForServer();
  }, 40_000);

  afterAll(() => {
    server?.kill();
    rmSync(SPA_DIR, { recursive: true, force: true });
  });

  it('sobe mesmo sem conseguir conectar no banco', () => {
    expect(cameUp).toBe(true);
  });

  it('continua servindo o frontend', async () => {
    const response = await fetch(`${BASE}/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Crealio SPA</title>');
  });

  it('responde nas rotas que não dependem do banco', async () => {
    const response = await fetch(`${BASE}/api`);

    expect(response.status).toBe(200);
  });

  // Timeout acima dos 5s de connectTimeout/acquireTimeout (ver
  // src/prisma/connection-url.ts): a rota tem que falhar, não pendurar.
  it(
    'falha só nas rotas de dados, sem derrubar o processo',
    async () => {
      const startedAt = Date.now();
      const response = await fetch(`${BASE}/api/materials`);

      expect(response.status).toBeGreaterThanOrEqual(500);
      // se voltar a pendurar indefinidamente, este limite acusa
      expect(Date.now() - startedAt).toBeLessThan(12_000);

      // e o processo segue vivo depois do erro
      const afterFailure = await fetch(`${BASE}/`);
      expect(afterFailure.status).toBe(200);
    },
    20_000,
  );
});
