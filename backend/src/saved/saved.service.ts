import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedItemDto } from './dto/create-saved-item.dto';

@Injectable()
export class SavedService {
  constructor(private readonly prisma: PrismaService) {}

  // Toggle: si ya estaba guardado, lo quita; si no, lo guarda. Mismo patron
  // que reactions.service.toggle.
  async toggle(userId: string, dto: CreateSavedItemDto) {
    if (!!dto.postId === !!dto.businessId) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId o businessId',
      );
    }

    const existing = dto.postId
      ? await this.prisma.savedItem.findUnique({
          where: { userId_postId: { userId, postId: dto.postId } },
        })
      : await this.prisma.savedItem.findUnique({
          where: {
            userId_businessId: {
              userId,
              businessId: dto.businessId as string,
            },
          },
        });

    if (existing) {
      await this.prisma.savedItem.delete({ where: { id: existing.id } });
      return { saved: false };
    }

    await this.prisma.savedItem.create({
      data: { userId, postId: dto.postId, businessId: dto.businessId },
    });
    return { saved: true };
  }

  findMany(userId: string) {
    return this.prisma.savedItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { post: true, business: true },
    });
  }
}
