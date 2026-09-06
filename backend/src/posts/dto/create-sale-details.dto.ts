import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';
import { SaleCondition } from '@prisma/client';

export class CreateSaleDetailsDto {
  @IsNumber()
  @IsPositive()
  price: number;

  // Codigo ISO 4217 (ej. "PEN", "USD"). Default PEN por el mercado inicial.
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsEnum(SaleCondition)
  condition?: SaleCondition;
}
