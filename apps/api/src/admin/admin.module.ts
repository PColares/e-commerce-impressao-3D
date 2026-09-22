import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { AdminUploadsController } from './admin-uploads.controller.js';
import { AdminQuotesController } from './admin-quotes.controller.js';
import { AdminQuotesService } from './admin-quotes.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminCatalogController, AdminUploadsController, AdminQuotesController],
  providers: [AdminCatalogService, AdminQuotesService],
})
export class AdminModule {}
