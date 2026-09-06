import { IsOptional, IsUUID } from 'class-validator';

export class ReactionSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;
}
