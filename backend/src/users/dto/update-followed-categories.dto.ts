import { IsArray, IsEnum } from 'class-validator';
import { PostCategory } from '@prisma/client';

export class UpdateFollowedCategoriesDto {
  @IsArray()
  @IsEnum(PostCategory, { each: true })
  categories: PostCategory[];
}
