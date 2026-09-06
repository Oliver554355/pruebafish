import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostCategory, ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; username: string; passwordHash: string }) {
    return this.prisma.user.create({ data });
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
      select: { id: true, username: true, createdAt: true },
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

    return {
      ...user,
      postsCount,
      commentsCount,
      followersCount,
      followingCount,
      reputation,
    };
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
    return { following: true };
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
