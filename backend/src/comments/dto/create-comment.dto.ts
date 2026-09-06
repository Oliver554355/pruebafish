import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  // Solo aplica junto con businessId: convierte el comentario en una review
  // de negocio (1 a 5).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
