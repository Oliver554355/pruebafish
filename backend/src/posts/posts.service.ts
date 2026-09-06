import { Injectable } from '@nestjs/common';
import { Prisma, PostCategory } from '@prisma/client';
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
  expiresAt: Date | null;
  distance: number;
}

// Vencimiento por defecto para categorias "temporales" (brief seccion 17):
// un accidente pierde relevancia en horas, no en dias. Categorias sin
// entrada aca (recomendaciones, ventas, animales, eventos sin fecha propia,
// etc.) quedan permanentes salvo que el usuario mande un expiresAt.
const DEFAULT_TTL_HOURS: Partial<Record<PostCategory, number>> = {
  ACCIDENTE: 6,
  INCIDENTE: 6,
  AVISO: 24,
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  create(authorId: string, dto: CreatePostDto) {
    const ttlHours = DEFAULT_TTL_HOURS[dto.category];
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : ttlHours
        ? new Date(Date.now() + ttlHours * 60 * 60 * 1000)
        : null;

    return this.prisma.post.create({
      data: { ...dto, authorId, expiresAt },
    });
  }

  // Usa la columna "geog" (geography(Point,4326) + indice GIST) creada por
  // prisma/postgis-extensions.sql, en vez de comparar lat/lng en cada fila.
  // Descarta posts vencidos (expiresAt en el pasado) ademas de los ocultos.
  findNearby(query: NearbyQueryDto) {
    const { lat, lng, radius = 3000, limit = 50 } = query;
    return this.prisma.$queryRaw<NearbyPostRow[]>(Prisma.sql`
      SELECT
        id, category, title, description, lat, lng,
        "authorId", "createdAt", "expiresAt",
        ST_Distance(geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance
      FROM "Post"
      WHERE ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )
      AND hidden = false
      AND ("expiresAt" IS NULL OR "expiresAt" > now())
      ORDER BY distance ASC
      LIMIT ${limit};
    `);
  }
}
