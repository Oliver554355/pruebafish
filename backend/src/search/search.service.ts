import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RESULTS_PER_TYPE = 10;
const MIN_QUERY_LENGTH = 2;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // Busqueda global simple (seccion "que mas falta" del roadmap):
  // publicaciones, points y usuarios en un solo endpoint, cada uno con
  // su propio "contains" case-insensitive. Las categorias no se buscan
  // aca -- el mobile ya tiene los labels en español (categoryStyle.ts)
  // y puede matchear localmente sin ida y vuelta al backend.
  async search(q: string) {
    const query = q.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      return { posts: [], businesses: [], users: [] };
    }

    const [posts, businesses, users] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          hidden: false,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: RESULTS_PER_TYPE,
        select: {
          id: true,
          category: true,
          title: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.business.findMany({
        where: {
          hidden: false,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ verified: 'desc' }, { name: 'asc' }],
        take: RESULTS_PER_TYPE,
        select: {
          id: true,
          category: true,
          name: true,
          address: true,
          verified: true,
        },
      }),
      this.prisma.user.findMany({
        where: { username: { contains: query, mode: 'insensitive' } },
        orderBy: { username: 'asc' },
        take: RESULTS_PER_TYPE,
        select: { id: true, username: true },
      }),
    ]);

    return { posts, businesses, users };
  }
}
