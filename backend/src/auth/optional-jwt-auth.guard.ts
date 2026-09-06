import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Igual que JwtAuthGuard, pero nunca rechaza la request: si no hay token o
// es invalido, req.user queda undefined en vez de tirar 401. Se usa en
// endpoints publicos que solo personalizan el resultado cuando hay sesion
// (ej. GET /posts/feed con las categorias seguidas del usuario).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: unknown, user: unknown): TUser {
    return (user ?? undefined) as TUser;
  }
}
