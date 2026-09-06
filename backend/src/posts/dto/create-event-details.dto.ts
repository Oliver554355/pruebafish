import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateEventDetailsDto {
  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsString()
  organizerName?: string;
}
