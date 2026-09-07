import { IsUUID } from 'class-validator';

export class ListProductsDto {
  @IsUUID()
  businessId: string;
}
