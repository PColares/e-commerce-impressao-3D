import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import {
  CreateColorDto,
  CreateLayerHeightDto,
  CreateMaterialDto,
  CreateProductDto,
  UpdateColorDto,
  UpdateLayerHeightDto,
  UpdateMaterialDto,
  UpdateProductDto,
} from './dto/admin-catalog.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get('products')
  listProducts() {
    return this.catalog.listProducts();
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalog.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalog.updateProduct(id, dto);
  }

  @Get('materials')
  listMaterials() {
    return this.catalog.listMaterials();
  }

  @Post('materials')
  createMaterial(@Body() dto: CreateMaterialDto) {
    return this.catalog.createMaterial(dto);
  }

  @Patch('materials/:id')
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.catalog.updateMaterial(id, dto);
  }

  @Get('colors')
  listColors() {
    return this.catalog.listColors();
  }

  @Post('colors')
  createColor(@Body() dto: CreateColorDto) {
    return this.catalog.createColor(dto);
  }

  @Patch('colors/:id')
  updateColor(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    return this.catalog.updateColor(id, dto);
  }

  @Get('layer-heights')
  listLayerHeights() {
    return this.catalog.listLayerHeights();
  }

  @Post('layer-heights')
  createLayerHeight(@Body() dto: CreateLayerHeightDto) {
    return this.catalog.createLayerHeight(dto);
  }

  @Patch('layer-heights/:id')
  updateLayerHeight(@Param('id') id: string, @Body() dto: UpdateLayerHeightDto) {
    return this.catalog.updateLayerHeight(id, dto);
  }
}
