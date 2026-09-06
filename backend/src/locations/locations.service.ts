import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListLocationsDto } from './dto/list-locations.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(query: ListLocationsDto) {
    const where: Prisma.LocationWhereInput = {
      parentId: query.parentId ?? null,
    };
    if (query.type) {
      where.type = query.type;
    }
    return this.prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.location.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
  }
}
