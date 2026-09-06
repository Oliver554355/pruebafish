import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { AnimalSex, AnimalSpecies } from '@prisma/client';

export class CreateAnimalDetailsDto {
  @IsEnum(AnimalSpecies)
  species: AnimalSpecies;

  @IsOptional()
  @IsString()
  petName?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  characteristics?: string;

  @IsOptional()
  @IsEnum(AnimalSex)
  sex?: AnimalSex;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approxAgeYears?: number;

  // Solo tiene sentido cuando el post es de categoria ADOPCION.
  @IsOptional()
  @IsString()
  @MinLength(3)
  adoptionConditions?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
