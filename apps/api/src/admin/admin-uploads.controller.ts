import {
  Controller,
  FileTypeValidator,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { FileStorage } from '../storage/file-storage.js';

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly storage: FileStorage) {}

  // O limite do multer corta o upload no meio; o MaxFileSizeValidator só
  // formata a mensagem. O FileTypeValidator confere os bytes do arquivo (não o
  // mimetype que o navegador declara), então um .txt renomeado é recusado.
  @Post('product-image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 1 } }))
  uploadProductImage(
    @UploadedFile(
      new ParseFilePipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        validators: [
          new MaxFileSizeValidator({ maxSize: PRODUCT_IMAGE_MAX_BYTES, message: 'Imagem acima de 5MB.' }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
            errorMessage: 'Envie uma imagem JPG, PNG ou WebP.',
          }),
        ],
      }),
    )
    file: { buffer: Buffer; originalname: string },
  ) {
    return this.storage.save(file.buffer, 'products', file.originalname);
  }
}
