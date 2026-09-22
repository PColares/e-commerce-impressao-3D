import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ModelUploadsController } from './model-uploads.controller.js';
import { FileStorage } from './file-storage.js';
import { LocalDiskStorage, resolveUploadDir } from './local-disk.storage.js';
import { PrivateDiskStorage, resolvePrivateUploadDir } from './private-disk.storage.js';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [ModelUploadsController],
  providers: [
    { provide: FileStorage, useFactory: () => new LocalDiskStorage(resolveUploadDir()) },
    { provide: PrivateDiskStorage, useFactory: () => new PrivateDiskStorage(resolvePrivateUploadDir()) },
  ],
  exports: [FileStorage, PrivateDiskStorage],
})
export class StorageModule {}
