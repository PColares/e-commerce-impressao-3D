import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  PrintFailureReason,
  PrinterManualStatus,
  PrintJobPriority,
  PrintJobStatus,
} from '../../generated/prisma/enums.js';

export class CreatePrinterDto {
  @ApiProperty({ example: 'K2 #1' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: 'Creality K2 Plus' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  model!: string;

  @ApiPropertyOptional({ example: '350 × 350 × 350 mm' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  buildVolume?: string;

  @ApiPropertyOptional({ example: 0.4 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(2)
  nozzleDiameter?: number;

  @ApiPropertyOptional({ example: 200, description: 'Horas de impressão entre manutenções' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maintenanceIntervalHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePrinterDto extends PartialType(CreatePrinterDto) {
  @ApiPropertyOptional({ enum: PrinterManualStatus })
  @IsOptional()
  @IsEnum(PrinterManualStatus)
  manualStatus?: PrinterManualStatus;
}

export class SlotDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(32)
  position!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorId?: string;
}

export class SetSlotsDto {
  @ApiProperty({ type: [SlotDto] })
  @IsArray()
  @ArrayMaxSize(32)
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots!: SlotDto[];
}

export class CreateJobDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiPropertyOptional({ description: 'Padrão: nome do arquivo do orçamento' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ enum: PrintJobPriority })
  @IsOptional()
  @IsEnum(PrintJobPriority)
  priority?: PrintJobPriority;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Tempo estimado pelo fatiador, em minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ description: 'Filamento estimado pelo fatiador, em gramas' })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateJobDto extends PartialType(OmitType(CreateJobDto, ['orderId'] as const)) {}

export class StartJobDto {
  @ApiProperty()
  @IsString()
  printerId!: string;
}

export class MoveJobDto {
  @ApiProperty({ enum: PrintJobStatus })
  @IsEnum(PrintJobStatus)
  status!: PrintJobStatus;
}

export class FailJobDto {
  @ApiProperty({ enum: PrintFailureReason })
  @IsEnum(PrintFailureReason)
  reason!: PrintFailureReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Filamento perdido, em gramas' })
  @IsOptional()
  @IsInt()
  @Min(0)
  wastedGrams?: number;
}
