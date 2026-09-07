import { IsOptional, IsUUID } from 'class-validator';

// El archivo en si llega como multipart ("file"), manejado por
// @UploadedFile() en el controller, no como parte de este DTO.
export class CreatePhotoDto {
  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
