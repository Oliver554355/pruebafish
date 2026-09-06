import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BusinessCategory } from '@prisma/client';

// Listado plano (sin geolocalizacion), util para navegar "restaurantes en
// Chosica" por zona/categoria en vez de por cercania al usuario.
export class ListBusinessesDto {
  @IsOptional()
  @IsEnum(BusinessCategory)
  category?: BusinessCategory;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
