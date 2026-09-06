import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BusinessClaimStatus } from '@prisma/client';

export class ListBusinessClaimsDto {
  @IsOptional()
  @IsEnum(BusinessClaimStatus)
  status?: BusinessClaimStatus;

  @IsOptional()
  @IsUUID()
  businessId?: string;
}
