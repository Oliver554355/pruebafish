import { Type } from 'class-transformer';
import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsInt, Min, Max } from 'class-validator';
import { PostCategory } from '@prisma/client';

export class NearbyQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

  // Radio de búsqueda en metros. Por defecto 3km, tope 20km para no
  // permitir consultas que barran toda la base de datos.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(20000)
  radius?: number = 3000;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  // Ej. filtrar solo VENTA para navegar el "marketplace" en el mapa.
  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;
}
