import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { AdminQuotesService } from './admin-quotes.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/quotes')
export class AdminQuotesController {
  constructor(private readonly quotes: AdminQuotesService) {}

  @Get()
  list() {
    return this.quotes.list();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.quotes.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.quotes.reject(id);
  }
}
