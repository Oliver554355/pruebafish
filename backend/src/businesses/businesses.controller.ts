import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { NearbyBusinessQueryDto } from './dto/nearby-business-query.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  // Cualquier usuario logueado puede dar de alta un lugar, como en
  // OSM/Google Maps. La verificacion de "dueño de negocio" es el roadmap #9.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businessesService.create(req.user.userId, dto);
  }

  @Get()
  findMany(@Query() query: ListBusinessesDto) {
    return this.businessesService.findMany(query);
  }

  @Get('nearby')
  nearby(@Query() query: NearbyBusinessQueryDto) {
    return this.businessesService.findNearby(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(id, req.user.userId, dto);
  }
}
