import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskStorage } from './local-disk.storage.js';

describe('LocalDiskStorage', () => {
  let root: string;
  let storage: LocalDiskStorage;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'crealio-storage-'));
    storage = new LocalDiskStorage(root);
  });

  it('grava o arquivo na pasta pedida e devolve a URL pública', async () => {
    const { url } = await storage.save(Buffer.from('conteudo'), 'products', 'Foto Da Peça.PNG');

    expect(url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.png$/);
    const onDisk = join(root, url.replace('/uploads/', ''));
    expect(readFileSync(onDisk, 'utf8')).toBe('conteudo');
  });

  it('nunca reaproveita o nome enviado pelo cliente', async () => {
    const a = await storage.save(Buffer.from('a'), 'products', 'foto.jpg');
    const b = await storage.save(Buffer.from('b'), 'products', 'foto.jpg');

    expect(a.url).not.toBe(b.url);
    expect(a.url).not.toContain('foto');
  });

  it('ignora caminho embutido no nome do arquivo', async () => {
    const { url } = await storage.save(Buffer.from('x'), 'products', '../../etc/passwd.png');

    expect(url.startsWith('/uploads/products/')).toBe(true);
    expect(existsSync(join(root, '..', 'etc'))).toBe(false);
  });

  it('recusa pasta fora da raiz de uploads', async () => {
    await expect(storage.save(Buffer.from('x'), '../fora', 'a.png')).rejects.toThrow();
  });
});
