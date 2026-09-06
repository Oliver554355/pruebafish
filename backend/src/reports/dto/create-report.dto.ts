import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ReportReason } from '@prisma/client';

export class CreateReportDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsUUID()
  commentId?: string;
}
