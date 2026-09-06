import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

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
}
