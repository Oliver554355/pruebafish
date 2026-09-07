import { Body, Controller, Delete, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('register-token')
  register(
    @Request() req: { user: { userId: string } },
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notificationsService.registerToken(req.user.userId, dto.token);
  }

  // Se llama al cerrar sesion, para que ese dispositivo deje de recibir
  // avisos de una cuenta de la que ya se salio.
  @UseGuards(JwtAuthGuard)
  @Delete('register-token')
  unregister(@Body() dto: RegisterPushTokenDto) {
    return this.notificationsService.unregisterToken(dto.token);
  }
}
