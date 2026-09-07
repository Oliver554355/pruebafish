import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { paginateByCursor } from '../common/paginate';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(authorId: string, dto: CreateCommentDto) {
    if (!!dto.postId === !!dto.businessId) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId o businessId',
      );
    }
    if (dto.rating !== undefined && !dto.businessId) {
      throw new BadRequestException(
        'rating solo aplica a comentarios de un negocio',
      );
    }
    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        rating: dto.rating,
        authorId,
        postId: dto.postId,
        businessId: dto.businessId,
      },
    });

    // Fire-and-forget: si el push falla (Firebase caido, token invalido,
    // etc.) no tiene que tumbar la creacion del comentario, que ya paso.
    this.notifyOwner(comment.authorId, dto).catch(() => {});

    return comment;
  }

  async findMany(query: ListCommentsDto) {
    if (!!query.postId === !!query.businessId) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId o businessId',
      );
    }
    const limit = query.limit ?? 20;
    const rows = await this.prisma.comment.findMany({
      where: {
        postId: query.postId,
        businessId: query.businessId,
        hidden: false,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { author: { select: { id: true, username: true } } },
      take: limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    });
    return paginateByCursor(rows, limit);
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('No podés borrar este comentario');
    }
    await this.prisma.comment.delete({ where: { id } });
  }

  // Avisa al autor del post, o al dueño (verificado si ya lo tiene, si no
  // quien lo creo) del negocio comentado -- mismo criterio de "dueño
  // efectivo" que ya usa BusinessesService.update. No se notifica a uno
  // mismo (comentar tu propio post/negocio).
  private async notifyOwner(commenterId: string, dto: CreateCommentDto) {
    let targetUserId: string | undefined;
    if (dto.postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.postId },
        select: { authorId: true },
      });
      targetUserId = post?.authorId;
    } else if (dto.businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: dto.businessId },
        select: { ownerId: true, createdById: true },
      });
      targetUserId = business?.ownerId ?? business?.createdById;
    }
    if (!targetUserId || targetUserId === commenterId) return;

    const commenter = await this.prisma.user.findUnique({
      where: { id: commenterId },
      select: { username: true },
    });
    await this.notifications.sendToUser(targetUserId, {
      title: '💬 Nuevo comentario',
      body: `${commenter?.username ?? 'Alguien'} comentó tu publicación`,
      data: {
        type: 'comment',
        postId: dto.postId ?? '',
        businessId: dto.businessId ?? '',
      },
    });
  }
}
