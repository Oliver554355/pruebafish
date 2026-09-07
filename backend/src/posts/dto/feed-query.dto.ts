import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator';
import { PostCategory } from '@prisma/client';

export class FeedQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

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
  limit?: number = 30;

  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  // Paginacion simple por desplazamiento: el feed ya viene ordenado por
  // "score" (no por un campo monotono como createdAt), asi que un cursor
  // real no aplica limpio aca -- offset alcanza para "cargar mas" en el
  // scroll sin tener que traer todo de una.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
