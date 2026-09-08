import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostCategory, ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../photos/storage.service';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Pesos arbitrarios, punto de partida — igual que el ranking de
// posts.service.feed, sin tuning con datos reales todavia. Base 3/5:
// un usuario nuevo sin actividad ni reportes arranca "neutral", ni bueno
// ni malo, en vez de 0 (que se leeria como "mal usuario" sin motivo).
const REPUTATION_BASE = 3;
const ACCOUNT_AGE_DAYS_FOR_MAX_BONUS = 180; // ~6 meses
const CONTENT_COUNT_FOR_MAX_BONUS = 20;
const INTERACTIONS_FOR_MAX_BONUS = 50;
const PENALTY_PER_CONFIRMED_REPORT = 0.3;
const MAX_REPORT_PENALTY = 1.5;
const PENALTY_PER_REMOVED_CONTENT = 0.2;
const MAX_REMOVED_PENALTY = 1;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; username: string; passwordHash: string }) {
    return this.prisma.user.create({ data });
  }

  // Reemplaza avatarKey por una URL firmada (o null), igual que
  // StorageService.signPhotos con los posts/negocios/productos -- nunca se
  // devuelve la key cruda al cliente.
  private async withAvatarUrl<T extends { avatarKey?: string | null }>(
    user: T,
  ): Promise<Omit<T, 'avatarKey'> & { avatarUrl: string | null }> {
    const { avatarKey, ...rest } = user;
    return {
      ...rest,
      avatarUrl: avatarKey ? await this.storage.getSignedUrl(avatarKey) : null,
    };
  }

  async getMe(id: string) {
    const user = await this.findById(id);
    if (!user) return null;
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.withAvatarUrl(safeUser);
  }

  // Perfil "privado" editable por el propio usuario. Por ahora solo el
  // username -- el email queda fuera porque es la credencial de login
  // (cambiarlo implicaria reverificarlo, fuera de alcance de este MVP).
  async updateProfile(id: string, data: { username?: string }) {
    if (data.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ese nombre de usuario ya está en uso');
      }
    }
    const user = await this.prisma.user.update({ where: { id }, data });
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.withAvatarUrl(safeUser);
  }

  // Autoservicio, sin moderador de por medio -- mismo criterio de tamaño y
  // formato que PhotosService (5MB, JPEG/PNG/WEBP). Reemplaza cualquier
  // avatar anterior en vez de acumular fotos (a diferencia de Photo, que es
  // una galeria, el avatar es un solo campo del perfil).
  async uploadAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (campo "file")');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Solo se aceptan imagenes JPEG, PNG o WEBP');
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException('La imagen no puede superar los 5MB');
    }
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });
    const key = await this.storage.upload(file);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarKey: key },
    });
    if (current?.avatarKey) {
      await this.storage.delete(current.avatarKey).catch(() => {});
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.withAvatarUrl(safeUser);
  }

  async removeAvatar(userId: string) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });
    if (current?.avatarKey) {
      await this.storage.delete(current.avatarKey).catch(() => {});
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarKey: null },
    });
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.withAvatarUrl(safeUser);
  }

  updateFollowedCategories(id: string, categories: PostCategory[]) {
    return this.prisma.user.update({
      where: { id },
      data: { followedCategories: categories },
      select: { id: true, followedCategories: true },
    });
  }

  // No es un puntaje solo de "likes" (brief seccion 15): combina antiguedad
  // de cuenta, actividad util (posts + recomendaciones), interaccion
  // recibida, y penaliza reportes confirmados (REVISADO) y contenido propio
  // que termino oculto por moderacion. Se calcula al vuelo, no se guarda
  // — evita que quede desactualizado si algo cambia (un reporte se revisa,
  // un post se oculta) sin tener que recalcular en cada evento.
  async getReputation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [
      postsCount,
      recommendationsCount,
      reactionsReceived,
      commentsReceived,
      reportsConfirmed,
      postsHidden,
      commentsHidden,
      businessesHidden,
    ] = await Promise.all([
      this.prisma.post.count({ where: { authorId: userId, hidden: false } }),
      this.prisma.post.count({
        where: {
          authorId: userId,
          category: PostCategory.RECOMENDACION,
          hidden: false,
        },
      }),
      this.prisma.reaction.count({ where: { post: { authorId: userId } } }),
      this.prisma.comment.count({
        where: { post: { authorId: userId }, hidden: false },
      }),
      this.prisma.report.count({
        where: {
          status: ReportStatus.REVISADO,
          OR: [
            { post: { authorId: userId } },
            { comment: { authorId: userId } },
            { business: { createdById: userId } },
          ],
        },
      }),
      this.prisma.post.count({ where: { authorId: userId, hidden: true } }),
      this.prisma.comment.count({
        where: { authorId: userId, hidden: true },
      }),
      this.prisma.business.count({
        where: { createdById: userId, hidden: true },
      }),
    ]);

    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const interactionsReceived = reactionsReceived + commentsReceived;
    const contentRemoved = postsHidden + commentsHidden + businessesHidden;

    const score =
      REPUTATION_BASE +
      Math.min(1, accountAgeDays / ACCOUNT_AGE_DAYS_FOR_MAX_BONUS) * 0.5 +
      Math.min(1, (postsCount + recommendationsCount) / CONTENT_COUNT_FOR_MAX_BONUS) *
        0.5 +
      Math.min(1, interactionsReceived / INTERACTIONS_FOR_MAX_BONUS) * 0.5 -
      Math.min(MAX_REPORT_PENALTY, reportsConfirmed * PENALTY_PER_CONFIRMED_REPORT) -
      Math.min(MAX_REMOVED_PENALTY, contentRemoved * PENALTY_PER_REMOVED_CONTENT);

    return {
      score: Math.round(Math.max(0, Math.min(5, score)) * 10) / 10,
      breakdown: {
        accountAgeDays,
        postsCount,
        recommendationsCount,
        interactionsReceived,
        reportsConfirmed,
        contentRemoved,
      },
    };
  }

  // Perfil publico (seccion 14 del brief): sin email ni passwordHash, con
  // los contadores que la ficha de usuario quiere mostrar.
  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, createdAt: true, avatarKey: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [postsCount, commentsCount, followersCount, followingCount, reputation] =
      await Promise.all([
        this.prisma.post.count({ where: { authorId: id, hidden: false } }),
        this.prisma.comment.count({ where: { authorId: id, hidden: false } }),
        this.prisma.follow.count({ where: { followingId: id } }),
        this.prisma.follow.count({ where: { followerId: id } }),
        this.getReputation(id),
      ]);

    return this.withAvatarUrl({
      ...user,
      postsCount,
      commentsCount,
      followersCount,
      followingCount,
      reputation,
    });
  }

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('No podés seguirte a vos mismo');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: followingId },
    });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) {
      await this.prisma.follow.delete({ where: { id: existing.id } });
      return { following: false };
    }
    await this.prisma.follow.create({ data: { followerId, followingId } });

    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true },
    });
    this.notifications
      .sendToUser(followingId, {
        title: '👤 Nuevo seguidor',
        body: `${follower?.username ?? 'Alguien'} empezó a seguirte`,
        data: { type: 'follow', userId: followerId },
      })
      .catch(() => {});

    return { following: true };
  }

  // Ultima ubicacion conocida (ver User.lastLat/lastLng en el schema):
  // la app la manda cada vez que obtiene el GPS. Es la base de las
  // notificaciones push de "algo paso cerca tuyo" (accidente, animal
  // perdido) -- ver NotificationsService.sendToNearby.
  updateLocation(id: string, lat: number, lng: number) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
      select: { id: true },
    });
  }

  getFollowers(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
      include: { follower: { select: { id: true, username: true } } },
    });
  }

  getFollowing(userId: string) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { following: { select: { id: true, username: true } } },
    });
  }
}
