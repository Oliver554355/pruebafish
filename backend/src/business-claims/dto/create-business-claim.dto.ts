import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateBusinessClaimDto {
  @IsUUID()
  businessId: string;

  // Ej. "Soy el dueño, este es mi numero de RUC / mi telefono ya listado".
  // No hay verificacion automatica de identidad: la evalua un moderador.
  @IsOptional()
  @IsString()
  @MinLength(3)
  message?: string;
}
