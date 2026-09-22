import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrivateDiskStorage } from './private-disk.storage.js';

describe('PrivateDiskStorage', () => {
  let root: string;
  let storage: PrivateDiskStorage;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'crealio-private-'));
    storage = new PrivateDiskStorage(root);
  });

  function tempUpload(content: string) {
    mkdirSync(storage.tempDir(), { recursive: true });
    const path = join(storage.tempDir(), `upload-${Math.random().toString(36).slice(2)}`);
    writeFileSync(path, content);
    return path;
  }

  it('move o upload temporário para a pasta e devolve uma chave, não uma URL', async () => {
    const temp = tempUpload('solid cubo');

    const { key } = await storage.adopt(temp, 'models', 'Minha Peça.STL');

    expect(key).toMatch(/^models\/[0-9a-f-]{36}\.stl$/);
    expect(existsSync(temp)).toBe(false);
    expect(readFileSync(storage.resolve(key)!, 'utf8')).toBe('solid cubo');
  });

  it('resolve devolve null para chave inexistente ou que tenta sair da pasta', async () => {
    expect(storage.resolve('models/00000000-0000-0000-0000-000000000000.stl')).toBeNull();
    expect(storage.resolve('../../etc/passwd')).toBeNull();
    expect(storage.resolve('models/../../fora.stl')).toBeNull();
  });

  it('criar o storage não mexe no disco (pasta sem permissão não derruba o boot)', () => {
    const fresh = join(root, 'ainda-nao-existe');
    new PrivateDiskStorage(fresh);
    expect(existsSync(fresh)).toBe(false);
  });

  it('a pasta temporária fica dentro da raiz (move sem copiar entre discos)', () => {
    expect(storage.tempDir().startsWith(root)).toBe(true);
  });
});
