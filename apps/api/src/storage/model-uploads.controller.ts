import { randomUUID } from 'node:crypto';
import { mkdir, open, stat, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  Controller,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { allowedModelExtensions, MAX_MODEL_FILE_SIZE_BYTES } from '@crealio/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { looksLikeModel } from './model-format.js';
import { PrivateDiskStorage, resolvePrivateUploadDir } from './private-disk.storage.js';

// Direto para o disco, não para a memória: são até 200MB por arquivo.
const incoming = diskStorage({
  destination: (_req, _file, done) => {
    const dir = join(resolvePrivateUploadDir(), '.incoming');
    mkdir(dir, { recursive: true }).then(() => done(null, dir), (error: Error) => done(error, dir));
  },
  filename: (_req, _file, done) => done(null, randomUUID()),
});

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class ModelUploadsController {
  constructor(private readonly storage: PrivateDiskStorage) {}

  @Post('model')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', { storage: incoming, limits: { fileSize: MAX_MODEL_FILE_SIZE_BYTES, files: 1 } }),
  )
  async uploadModel(@UploadedFile() file: { path: string; originalname: string; size: number } | undefined) {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "file".');

    try {
      const extension = extname(file.originalname).toLowerCase();
      if (!(allowedModelExtensions as readonly string[]).includes(extension)) {
        throw new UnprocessableEntityException(`Formato não suportado. Use: ${allowedModelExtensions.join(', ')}`);
      }
      if (!looksLikeModel(extension, await readHead(file.path), (await stat(file.path)).size)) {
        throw new UnprocessableEntityException(
          `O conteúdo não parece um arquivo ${extension.slice(1).toUpperCase()}. Exporte o modelo de novo e tente outra vez.`,
        );
      }
      const { key } = await this.storage.adopt(file.path, 'models', file.originalname);
      return { key, fileName: file.originalname, size: file.size };
    } catch (error) {
      // Recusado ou falhou no meio: não deixa o temporário ocupando disco.
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }
}

async function readHead(path: string): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}
