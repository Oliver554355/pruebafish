import { IsOptional, IsUUID } from 'class-validator';

export class ListCommentsDto {
  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;
}
