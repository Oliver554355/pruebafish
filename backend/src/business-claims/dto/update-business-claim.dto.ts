import { IsEnum } from 'class-validator';
import { BusinessClaimStatus } from '@prisma/client';

export class UpdateBusinessClaimDto {
  // Solo APROBADO o RECHAZADO tienen sentido aca (validado en el
  // servicio); PENDIENTE es el estado inicial, no algo a lo que volver.
  @IsEnum(BusinessClaimStatus)
  status: BusinessClaimStatus;
}
