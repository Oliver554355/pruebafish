import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SavedService } from './saved.service';
import { CreateSavedItemDto } from './dto/create-saved-item.dto';
import { ListSavedDto } from './dto/list-saved.dto';

@Controller('saved')
export class SavedController {
  constructor(private readonly savedService: SavedService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  toggle(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateSavedItemDto,
  ) {
    return this.savedService.toggle(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMany(
    @Request() req: { user: { userId: string } },
    @Query() query: ListSavedDto,
  ) {
    return this.savedService.findMany(req.user.userId, query);
  }
}
