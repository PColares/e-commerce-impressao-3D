import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProductionController } from './production.controller.js';
import { ProductionService } from './production.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
