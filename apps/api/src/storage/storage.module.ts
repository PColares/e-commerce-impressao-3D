import { Global, Module } from '@nestjs/common';
import { FileStorage } from './file-storage.js';
import { LocalDiskStorage, resolveUploadDir } from './local-disk.storage.js';

@Global()
@Module({
  providers: [{ provide: FileStorage, useFactory: () => new LocalDiskStorage(resolveUploadDir()) }],
  exports: [FileStorage],
})
export class StorageModule {}
