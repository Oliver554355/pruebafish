import { BadRequestException, Injectable } from '@nestjs/common';
import { ReactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionSummaryQueryDto } from './dto/reaction-summary-query.dto';

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Toggle: si el usuario ya habia puesto esa reaccion, la quita; si no, la crea.
  async toggle(userId: string, dto: CreateReactionDto) {
    if (!!dto.postId === !!dto.businessId) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId o businessId',
      );
    }
    const type = dto.type ?? ReactionType.LIKE;

    const existing = dto.postId
      ? await this.prisma.reaction.findUnique({
          where: { userId_postId_type: { userId, postId: dto.postId, type } },
        })
      : await this.prisma.reaction.findUnique({
          where: {
            userId_businessId_type: {
              userId,
              businessId: dto.businessId as string,
              type,
            },
          },
        });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      return { reacted: false };
    }

    await this.prisma.reaction.create({
      data: { userId, type, postId: dto.postId, businessId: dto.businessId },
    });
    return { reacted: true };
  }

  async summary(query: ReactionSummaryQueryDto) {
    if (!!query.postId === !!query.businessId) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId o businessId',
      );
    }
    const grouped = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { postId: query.postId, businessId: query.businessId },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ type: g.type, count: g._count._all }));
  }
}
