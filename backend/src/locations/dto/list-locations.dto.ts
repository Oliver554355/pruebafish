import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LocationType } from '@prisma/client';

export class ListLocationsDto {
  // Sin parentId: devuelve el nivel raiz (paises). Con parentId: los hijos
  // directos de esa ubicacion (ej. regiones de un pais, distritos de una
  // provincia, etc.) — asi el cliente arma el selector nivel por nivel.
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;
}
