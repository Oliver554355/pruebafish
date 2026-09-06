import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PostCategory } from '@prisma/client';
import { CreateAnimalDetailsDto } from './create-animal-details.dto';
import { CreateEventDetailsDto } from './create-event-details.dto';
import { CreateSaleDetailsDto } from './create-sale-details.dto';

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

  // Cuando el post tiene una fecha natural de vencimiento (ej. un EVENTO
  // que ya paso). Si no se manda, las categorias que decaen (accidentes,
  // incidentes, avisos) reciben un valor por defecto automatico.
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  // Requerido si category es ANIMAL_PERDIDO/ANIMAL_ENCONTRADO/ADOPCION,
  // prohibido en cualquier otra categoria (validado en posts.service.ts).
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAnimalDetailsDto)
  animal?: CreateAnimalDetailsDto;

  // Requerido si category es EVENTO, prohibido en cualquier otra
  // (validado en posts.service.ts).
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEventDetailsDto)
  event?: CreateEventDetailsDto;

  // Requerido si category es VENTA, prohibido en cualquier otra
  // (validado en posts.service.ts).
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSaleDetailsDto)
  sale?: CreateSaleDetailsDto;
}
