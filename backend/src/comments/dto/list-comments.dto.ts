import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListCommentsDto {
  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  // Paginacion por cursor (id del ultimo comentario ya recibido, el
  // cliente lo saca de "nextCursor"): mas robusta que offset si se
  // siguen agregando comentarios nuevos mientras alguien pagina.
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
