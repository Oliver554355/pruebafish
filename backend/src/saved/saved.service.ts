import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginateByCursor } from '../common/paginate';
import { CreateSavedItemDto } from './dto/create-saved-item.dto';
import { ListSavedDto } from './dto/list-saved.dto';

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

  async findMany(userId: string, query: ListSavedDto) {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.savedItem.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { post: true, business: true },
      take: limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    });
    return paginateByCursor(rows, limit);
  }
}
