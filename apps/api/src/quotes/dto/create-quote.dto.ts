import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  fileName!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  fileUrl!: string;

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
