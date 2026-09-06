import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { ListLocationsDto } from './dto/list-locations.dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  findMany(@Query() query: ListLocationsDto) {
    return this.locationsService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }
}
