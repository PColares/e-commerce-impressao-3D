import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { AdminUploadsController } from './admin-uploads.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminCatalogController, AdminUploadsController],
  providers: [AdminCatalogService],
})
export class AdminModule {}
