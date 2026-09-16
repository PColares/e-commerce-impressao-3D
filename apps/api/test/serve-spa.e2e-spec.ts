import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Smoke test da topologia de produção: um único processo Node serve a API e o
// build do Vue (é assim que o app vai para a Hostinger). O risco que isso
// protege é o fallback do SPA engolir as rotas /api.
//
// Roda contra o código COMPILADO, então precisa de `nest build` antes. Foi feito
// assim de propósito: com Test.createTestingModule o middleware do
// ServeStaticModule não é aplicado, e o teste passava/falhava sem relação com o
// comportamento real do servidor.

const API_ROOT = process.cwd();
const DIST_ENTRY = join(API_ROOT, 'dist', 'main.js');
const SPA_DIR = join(API_ROOT, 'test', '__spa-fixture__');
const PORT = 3401;
const BASE = `http://localhost:${PORT}`;

const built = existsSync(DIST_ENTRY);

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE}/api`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error('servidor não subiu no tempo esperado');
}

describe.skipIf(!built)('produção: um processo servindo API + SPA', () => {
  let server: ChildProcess;

  beforeAll(async () => {
    mkdirSync(SPA_DIR, { recursive: true });
    writeFileSync(join(SPA_DIR, 'index.html'), '<!doctype html><title>Camada SPA</title>');

    server = spawn(process.execPath, [DIST_ENTRY], {
      cwd: API_ROOT,
      env: { ...process.env, PORT: String(PORT), SPA_DIR },
      stdio: 'ignore',
    });

    await waitForServer();
  }, 40_000);

  afterAll(() => {
    server?.kill();
    rmSync(SPA_DIR, { recursive: true, force: true });
  });

  it('serve o index.html na raiz', async () => {
    const response = await fetch(`${BASE}/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Camada SPA</title>');
  });

  it('faz fallback para o index.html nas rotas do Vue Router', async () => {
    // /catalogo não existe no servidor; quem resolve é o router no cliente
    const response = await fetch(`${BASE}/catalogo`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Camada SPA</title>');
  });

  it('NÃO deixa o fallback do SPA engolir as rotas da API', async () => {
    const response = await fetch(`${BASE}/api`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain('Camada SPA');
    expect(body).toContain('Hello World');
  });

  it('devolve 404 em JSON para rota inexistente da API, não HTML do SPA', async () => {
    const response = await fetch(`${BASE}/api/rota-que-nao-existe`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.text()).not.toContain('Camada SPA');
  });
});
