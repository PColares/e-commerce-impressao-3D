import { createReadStream } from 'node:fs';
import { Controller, Get, Param, Post, StreamableFile, UseGuards } from '@nestjs/common';
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

  @Get(':id/file')
  async file(@Param('id') id: string) {
    const { path, fileName } = await this.quotes.file(id);
    return new StreamableFile(createReadStream(path), {
      type: 'application/octet-stream',
      // filename* com UTF-8 para nomes com acento ("peça.stl").
      disposition: `attachment; filename="${fileName.replace(/[^ -~]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    });
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
