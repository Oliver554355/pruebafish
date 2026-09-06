import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.create(req.user.userId, dto);
  }

  // Publico: cualquiera puede ver que esta pasando cerca sin loguearse,
  // igual que el mapa de la app. Orden simple por distancia (pines de mapa).
  @Get('nearby')
  nearby(@Query() query: NearbyQueryDto) {
    return this.postsService.findNearby(query);
  }

  // Publico, pero personaliza si hay sesion (categorias seguidas). Es el
  // feed de la seccion "Comunidad", con ranking (ver posts.service.feed).
  @UseGuards(OptionalJwtAuthGuard)
  @Get('feed')
  feed(
    @Query() query: FeedQueryDto,
    @Request() req: { user?: { userId: string } },
  ) {
    return this.postsService.feed(query, req.user?.userId);
  }

  // Debe ir despues de 'nearby' y 'feed': si no, Nest interpretaria esas
  // palabras como el valor de :id.
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/mark-sold')
  markSold(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.postsService.markSold(id, req.user.userId);
  }
}
