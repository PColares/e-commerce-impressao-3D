import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { FileStorage } from './file-storage.js';

export const UPLOADS_URL_PREFIX = '/uploads';

// Na Hostinger cada deploy roda numa pasta nova (hbuilds/versions/<uuid>), então
// o que estiver aqui some a cada redeploy. Aceito para este projeto pessoal;
// para guardar de verdade, a saída é um FileStorage de object storage.
export function resolveUploadDir(): string {
  return process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
}

export class LocalDiskStorage extends FileStorage {
  constructor(private readonly root: string) {
    super();
  }

  async save(content: Buffer, folder: string, originalName: string): Promise<{ url: string }> {
    const dir = resolve(this.root, folder);
    const fromRoot = relative(resolve(this.root), dir);
    if (fromRoot.startsWith('..') || resolve(fromRoot) === fromRoot) {
      throw new Error(`Pasta de upload inválida: ${folder}`);
    }

    // O nome vem do cliente: aproveita só a extensão, e o arquivo ganha um UUID.
    const extension = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const fileName = `${randomUUID()}${extension}`;

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fileName), content);

    return { url: `${UPLOADS_URL_PREFIX}/${fromRoot.split('\\').join('/')}/${fileName}` };
  }
}
