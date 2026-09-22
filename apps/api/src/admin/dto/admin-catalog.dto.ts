import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: 'Gerado a partir do nome quando omitido' })
  @IsOptional()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug deve ter só letras minúsculas, números e hífens' })
  slug?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional({ example: 'PETG' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: '0.20mm' })
  @IsOptional()
  @IsString()
  layerHeightLabel?: string;

  @ApiPropertyOptional({ example: '12 cm · 48 g · preenchimento 20%' })
  @IsOptional()
  @IsString()
  specSheet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class CreateMaterialDto {
  @ApiProperty({ example: 'TPU' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  // Decimal(4,2) no banco: até 99.99
  @ApiProperty({ example: 1.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99.99)
  priceMultiplier!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}

export class CreateColorDto {
  @ApiProperty({ example: 'Azul' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: '#1E40AF' })
  @IsHexColor()
  hex!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateColorDto extends PartialType(CreateColorDto) {}

export class CreateLayerHeightDto {
  // Decimal(3,2) no banco: até 9.99mm
  @ApiProperty({ example: 0.16 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9.99)
  millimeters!: number;

  @ApiProperty({ example: 0.95 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99.99)
  priceMultiplier!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateLayerHeightDto extends PartialType(CreateLayerHeightDto) {}
