import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';

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
  // igual que el mapa de la app.
  @Get('nearby')
  nearby(@Query() query: NearbyQueryDto) {
    return this.postsService.findNearby(query);
  }
}
