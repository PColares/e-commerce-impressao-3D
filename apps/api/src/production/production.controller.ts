import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ProductionService } from './production.service.js';
import {
  CreateJobDto,
  CreatePrinterDto,
  FailJobDto,
  MoveJobDto,
  SetSlotsDto,
  StartJobDto,
  UpdateJobDto,
  UpdatePrinterDto,
} from './dto/production.dto.js';

@ApiTags('admin · produção')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get('printers')
  listPrinters() {
    return this.production.listPrinters();
  }

  @Post('printers')
  createPrinter(@Body() dto: CreatePrinterDto) {
    return this.production.createPrinter(dto);
  }

  @Patch('printers/:id')
  updatePrinter(@Param('id') id: string, @Body() dto: UpdatePrinterDto) {
    return this.production.updatePrinter(id, dto);
  }

  @Delete('printers/:id')
  @HttpCode(204)
  async deletePrinter(@Param('id') id: string) {
    await this.production.deletePrinter(id);
  }

  @Post('printers/:id/maintenance')
  registerMaintenance(@Param('id') id: string) {
    return this.production.registerMaintenance(id);
  }

  @Put('printers/:id/slots')
  @HttpCode(204)
  async setSlots(@Param('id') id: string, @Body() dto: SetSlotsDto) {
    await this.production.setSlots(id, dto);
  }

  @Get('orders')
  listOrders() {
    return this.production.listOrders();
  }

  @Get('jobs')
  listJobs() {
    return this.production.listJobs();
  }

  @Post('jobs')
  createJob(@Body() dto: CreateJobDto) {
    return this.production.createJob(dto);
  }

  @Patch('jobs/:id')
  updateJob(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.production.updateJob(id, dto);
  }

  @Post('jobs/:id/start')
  startJob(@Param('id') id: string, @Body() dto: StartJobDto) {
    return this.production.startJob(id, dto.printerId);
  }

  @Post('jobs/:id/finish-print')
  finishPrint(@Param('id') id: string) {
    return this.production.finishPrint(id);
  }

  @Post('jobs/:id/fail')
  failJob(@Param('id') id: string, @Body() dto: FailJobDto) {
    return this.production.failJob(id, dto);
  }

  @Post('jobs/:id/move')
  moveJob(@Param('id') id: string, @Body() dto: MoveJobDto) {
    return this.production.moveJob(id, dto.status);
  }
}
