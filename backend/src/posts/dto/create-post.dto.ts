import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PostCategory } from '@prisma/client';

export class CreatePostDto {
  @IsEnum(PostCategory)
  category: PostCategory;

  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  // Zona de la jerarquia Location (ej. "Chosica"). Opcional por ahora: la
  // busqueda por cercania ya funciona solo con lat/lng.
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
