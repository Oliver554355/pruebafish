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
import { ModeratorGuard } from '../auth/moderator.guard';
import { BusinessClaimsService } from './business-claims.service';
import { CreateBusinessClaimDto } from './dto/create-business-claim.dto';
import { ListBusinessClaimsDto } from './dto/list-business-claims.dto';
import { UpdateBusinessClaimDto } from './dto/update-business-claim.dto';

@Controller('business-claims')
export class BusinessClaimsController {
  constructor(private readonly businessClaimsService: BusinessClaimsService) {}

  // Cualquier usuario logueado puede pedir ser el dueño verificado de un
  // negocio que todavia no tenga uno.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateBusinessClaimDto,
  ) {
    return this.businessClaimsService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @Get()
  findMany(@Query() query: ListBusinessClaimsDto) {
    return this.businessClaimsService.findMany(query);
  }

  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateBusinessClaimDto,
  ) {
    return this.businessClaimsService.update(id, req.user.userId, dto);
  }
}
