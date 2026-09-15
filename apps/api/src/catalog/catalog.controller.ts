import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service.js';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('materials')
  materials() {
    return this.catalog.materials();
  }

  @Get('layer-heights')
  layerHeights() {
    return this.catalog.layerHeights();
  }

  @Get('colors')
  colors() {
    return this.catalog.colors();
  }

  @Get('products')
  products() {
    return this.catalog.products();
  }
}
