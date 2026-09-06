import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from 'class-validator';
import { PostCategory } from '@prisma/client';

export class CreatePostDto {
  @IsEnum(PostCategory)
  category: PostCategory;

  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;
}
