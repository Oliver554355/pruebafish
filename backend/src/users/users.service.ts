import { Injectable } from '@nestjs/common';
import { PostCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
