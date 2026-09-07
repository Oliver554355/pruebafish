import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateFollowedCategoriesDto } from './dto/update-followed-categories.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: { user: { userId: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) return null;
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  // Preferencia para el feed (GET /posts/feed): boost a las categorias que
  // el usuario elija seguir. Reemplaza la lista completa cada vez.
  @UseGuards(JwtAuthGuard)
  @Patch('me/followed-categories')
  updateFollowedCategories(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateFollowedCategoriesDto,
  ) {
    return this.usersService.updateFollowedCategories(
      req.user.userId,
      dto.categories,
    );
  }

  // La app la llama cada vez que obtiene el GPS (ver notifications
  // "cerca tuyo"): mantiene lastLat/lastLng razonablemente al dia sin
  // necesitar tracking continuo en background.
  @UseGuards(JwtAuthGuard)
  @Patch('me/location')
  updateLocation(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateLocationDto,
  ) {
    return this.usersService.updateLocation(req.user.userId, dto.lat, dto.lng);
  }

  // Rutas con :id van despues de las rutas estaticas ('me', 'me/...') para
  // que Nest no interprete "me" como un valor de :id.
  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  follow(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.usersService.toggleFollow(req.user.userId, id);
  }

  @Get(':id/followers')
  followers(@Param('id') id: string) {
    return this.usersService.getFollowers(id);
  }

  @Get(':id/following')
  following(@Param('id') id: string) {
    return this.usersService.getFollowing(id);
  }

  // Perfil publico (sin email), con contadores y reputacion.
  @Get(':id')
  publicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
