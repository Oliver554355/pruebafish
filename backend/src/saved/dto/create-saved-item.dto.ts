import { IsOptional, IsUUID } from 'class-validator';

export class CreateSavedItemDto {
  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;
}
