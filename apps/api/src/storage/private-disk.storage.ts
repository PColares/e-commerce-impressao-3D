import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

// Arquivos dos clientes (modelos 3D). Diferente de LocalDiskStorage, esta pasta
// NÃO é servida estaticamente: o arquivo só sai por uma rota autenticada, e o
// que circula é uma chave ("models/<uuid>.stl"), não uma URL.
//
// Na Hostinger fica na pasta do deploy e some a cada redeploy (aceito neste
// projeto pessoal); a saída para guardar de verdade é object storage.
export function resolvePrivateUploadDir(): string {
  return process.env.PRIVATE_UPLOAD_DIR ?? join(process.cwd(), 'private-uploads');
}

export class PrivateDiskStorage {
  private readonly root: string;

  // Não toca no disco aqui: se a pasta não puder ser criada, o erro aparece no
  // upload, e não derruba o app na inicialização (um 503 no site inteiro).
  constructor(root: string) {
    this.root = resolve(root);
  }

  // Onde o multer grava o upload em andamento. Dentro da raiz para o rename
  // final ser no mesmo disco (entre discos o rename falha com EXDEV).
  tempDir(): string {
    return join(this.root, '.incoming');
  }

  async adopt(tempPath: string, folder: string, originalName: string): Promise<{ key: string }> {
    const extension = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const key = `${folder}/${randomUUID()}${extension}`;
    const target = this.inside(key);
    if (!target) throw new Error(`Pasta inválida: ${folder}`);

    await mkdir(join(this.root, folder), { recursive: true });
    await rename(tempPath, target);
    return { key };
  }

  // Caminho absoluto do arquivo, ou null se a chave não existe ou tenta sair da raiz.
  resolve(key: string): string | null {
    const path = this.inside(key);
    return path && existsSync(path) ? path : null;
  }

  private inside(key: string): string | null {
    const path = resolve(this.root, key);
    const fromRoot = relative(this.root, path);
    if (!fromRoot || fromRoot.startsWith('..') || resolve(fromRoot) === fromRoot) return null;
    return path;
  }
}
