import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(authorId: string, dto: CreateCommentDto) {
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
    return this.prisma.comment.create({
      data: {
        content: dto.content,
        rating: dto.rating,
        authorId,
        postId: dto.postId,
        businessId: dto.businessId,
      },
    });
  }

  findMany(query: ListCommentsDto) {
    if (!!query.postId === !!query.businessId) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId o businessId',
      );
    }
    return this.prisma.comment.findMany({
      where: {
        postId: query.postId,
        businessId: query.businessId,
        hidden: false,
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, username: true } } },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('No podés borrar este comentario');
    }
    await this.prisma.comment.delete({ where: { id } });
  }
}
