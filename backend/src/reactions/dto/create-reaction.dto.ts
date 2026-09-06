import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReactionType } from '@prisma/client';

export class CreateReactionDto {
  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsEnum(ReactionType)
  type?: ReactionType;
}
