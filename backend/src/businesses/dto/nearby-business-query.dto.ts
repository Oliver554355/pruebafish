import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { BusinessCategory } from '@prisma/client';

export class NearbyBusinessQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

  // Radio en metros. Igual que en posts/nearby: tope de 20km para no
  // permitir consultas que barran toda la tabla.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(20000)
  radius?: number = 3000;

  @IsOptional()
  @IsEnum(BusinessCategory)
  category?: BusinessCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
