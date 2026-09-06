import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateFollowedCategoriesDto } from './dto/update-followed-categories.dto';

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
}
