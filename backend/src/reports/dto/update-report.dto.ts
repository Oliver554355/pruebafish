import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  // Ademas de cambiar el estado del reporte, oculta el contenido reportado.
  @IsOptional()
  @IsBoolean()
  hideContent?: boolean;
}
