import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// firebase-admin v14 usa la API modular (como el SDK v9+ de firebase web),
// no el namespace viejo "admin.credential"/"admin.messaging()".
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly app: App | null;

  // Sin FIREBASE_SERVICE_ACCOUNT_JSON, el servicio queda en modo no-op
  // (se loguea y no se manda nada) en vez de tirar el backend abajo --
  // asi el resto de la app (comentarios, likes, seguir) sigue funcionando
  // mientras se termina de configurar Firebase.
  constructor(private readonly prisma: PrismaService) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!key) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_JSON no configurado: notificaciones push deshabilitadas (no-op).',
      );
      this.app = null;
      return;
    }
    this.app = initializeApp({ credential: cert(JSON.parse(key)) });
  }

  // Un mismo token de dispositivo puede haber quedado antes asociado a
  // otra cuenta (logout + login con otro usuario en el mismo celular);
  // upsert por token (no por [userId, token]) para que siempre apunte a
  // la sesion activa actual.
  registerToken(userId: string, token: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token },
    });
  }

  unregisterToken(token: string) {
    return this.prisma.pushToken.deleteMany({ where: { token } });
  }

  async sendToUser(userId: string, payload: PushPayload) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    await this.sendToTokens(
      tokens.map((t) => t.token),
      payload,
    );
  }

  async sendToUsers(userIds: string[], payload: PushPayload) {
    if (userIds.length === 0) return;
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });
    await this.sendToTokens(
      tokens.map((t) => t.token),
      payload,
    );
  }

  // Usuarios con ubicacion conocida (lastLat/lastLng -> columna "geog"
  // generada, ver postgis-extensions.sql, mismo patron que Post/Business)
  // dentro del radio. excludeUserId es siempre el autor del post que
  // dispara el aviso -- no tiene sentido notificarse a uno mismo.
  async sendToNearby(
    lat: number,
    lng: number,
    radiusMeters: number,
    excludeUserId: string,
    payload: PushPayload,
  ) {
    const nearbyUsers = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "User"
      WHERE geog IS NOT NULL
      AND id != ${excludeUserId}
      AND ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
    `);
    await this.sendToUsers(
      nearbyUsers.map((u) => u.id),
      payload,
    );
  }

  private async sendToTokens(tokens: string[], payload: PushPayload) {
    if (tokens.length === 0) return;
    if (!this.app) {
      this.logger.debug(`(no-op) ${payload.title}: ${payload.body} -> ${tokens.length} token(s)`);
      return;
    }
    const response = await getMessaging(this.app).sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
    });
    const invalidTokens = response.responses
      .map((r, i) =>
        !r.success && INVALID_TOKEN_ERROR_CODES.has(r.error?.code ?? '') ? tokens[i] : null,
      )
      .filter((t): t is string => t !== null);
    if (invalidTokens.length > 0) {
      await this.prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
  }
}
