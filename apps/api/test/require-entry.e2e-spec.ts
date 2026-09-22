import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A Hostinger não roda `npm start`: ela carrega o "entry file" do app com
// require(), como o LiteSpeed/Passenger fazem. O dist/main.js é ESM, e o Node
// só aceita require() de ESM se o grafo não tiver top-level await — com um
// `await bootstrap()` no topo o processo morre com ERR_REQUIRE_ASYNC_MODULE
// antes de abrir a porta, e o site só devolve 503 com o build "Concluído".

const API_ROOT = process.cwd();
const DIST_ENTRY = join(API_ROOT, 'dist', 'main.js');
const built = existsSync(DIST_ENTRY);

function bootViaRequire(): Promise<{ started: boolean; output: string }> {
  const env = {
    ...process.env,
    PORT: '3407',
    JWT_SECRET: 'segredo-de-teste',
    DATABASE_URL: 'mysql://x:y@127.0.0.1:59999/z',
  };
  const isolatedCwd = mkdtempSync(join(tmpdir(), 'camada-require-'));

  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['-e', `require(${JSON.stringify(DIST_ENTRY)})`], {
      cwd: isolatedCwd,
      env,
    });
    let output = '';
    const onData = (chunk: Buffer) => {
      output += chunk;
      if (output.includes('Nest application successfully started')) {
        child.kill();
        resolve({ started: true, output });
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    const timer = setTimeout(() => {
      child.kill();
      resolve({ started: false, output });
    }, 15_000);

    child.on('exit', () => {
      clearTimeout(timer);
      resolve({ started: output.includes('Nest application successfully started'), output });
    });
  });
}

describe.skipIf(!built)('entry file carregado com require()', () => {
  it('sobe o app como a Hostinger inicia', async () => {
    const { started, output } = await bootViaRequire();

    expect(output).not.toContain('ERR_REQUIRE_ASYNC_MODULE');
    expect(started).toBe(true);
  }, 25_000);
});
