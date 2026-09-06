import { IsEnum, IsOptional } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ListReportsDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
