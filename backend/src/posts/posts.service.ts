import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';

interface NearbyPostRow {
  id: string;
  category: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  authorId: string;
  createdAt: Date;
  distance: number;
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  create(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: { ...dto, authorId },
    });
  }

  // Usa la columna "geog" (geography(Point,4326) + indice GIST) creada por
  // prisma/postgis-extensions.sql, en vez de comparar lat/lng en cada fila.
  findNearby(query: NearbyQueryDto) {
    const { lat, lng, radius = 3000, limit = 50 } = query;
    return this.prisma.$queryRaw<NearbyPostRow[]>(Prisma.sql`
      SELECT
        id, category, title, description, lat, lng,
        "authorId", "createdAt",
        ST_Distance(geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance
      FROM "Post"
      WHERE ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )
      ORDER BY distance ASC
      LIMIT ${limit};
    `);
  }
}
