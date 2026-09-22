import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { MODEL_KEY_PATTERN } from '@crealio/shared';

export class CreateQuoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  fileName!: string;

  @ApiProperty({ description: 'Chave devolvida por POST /uploads/model', example: 'models/3f2b8c1e-9d4a-4f6e-8b7a-1c2d3e4f5a6b.stl' })
  @Matches(MODEL_KEY_PATTERN, { message: 'Arquivo inválido: envie o modelo pelo upload.' })
  fileKey!: string;

  @ApiProperty()
  @IsString()
  materialId!: string;

  @ApiProperty()
  @IsString()
  layerHeightId!: string;

  @ApiProperty()
  @IsString()
  colorId!: string;

  @ApiProperty({ minimum: 1, maximum: 999 })
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}
