import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';

// Se usa despues de JwtAuthGuard (@UseGuards(JwtAuthGuard, ModeratorGuard)).
// Consulta la base en cada request en vez de confiar en el JWT: asi
// revocar el rol de moderador tiene efecto inmediato, sin esperar a que
// expire el token.
@Injectable()
export class ModeratorGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    const user = userId ? await this.usersService.findById(userId) : null;
    if (!user?.isModerator) {
      throw new ForbiddenException('Requiere permisos de moderador');
    }
    return true;
  }
}
