import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PostCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

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

interface FeedPostRow extends NearbyPostRow {
  reactionCount: number;
  commentCount: number;
  score: number;
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

const ANIMAL_CATEGORIES: PostCategory[] = [
  PostCategory.ANIMAL_PERDIDO,
  PostCategory.ANIMAL_ENCONTRADO,
  PostCategory.ADOPCION,
];

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  create(authorId: string, dto: CreatePostDto) {
    const isAnimalCategory = ANIMAL_CATEGORIES.includes(dto.category);
    const isEventCategory = dto.category === PostCategory.EVENTO;

    if (isAnimalCategory && !dto.animal) {
      throw new BadRequestException(
        'Los posts de animales requieren el campo "animal"',
      );
    }
    if (!isAnimalCategory && dto.animal) {
      throw new BadRequestException(
        '"animal" solo aplica a categorias de animales',
      );
    }
    if (isEventCategory && !dto.event) {
      throw new BadRequestException(
        'Los posts de eventos requieren el campo "event"',
      );
    }
    if (!isEventCategory && dto.event) {
      throw new BadRequestException('"event" solo aplica a la categoria EVENTO');
    }

    const ttlHours = DEFAULT_TTL_HOURS[dto.category];
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : isEventCategory && dto.event
        ? new Date(dto.event.startsAt)
        : ttlHours
          ? new Date(Date.now() + ttlHours * 60 * 60 * 1000)
          : null;

    return this.prisma.post.create({
      data: {
        category: dto.category,
        title: dto.title,
        description: dto.description,
        lat: dto.lat,
        lng: dto.lng,
        locationId: dto.locationId,
        authorId,
        expiresAt,
        animalDetails: dto.animal ? { create: dto.animal } : undefined,
        eventDetails: dto.event
          ? {
              create: {
                startsAt: new Date(dto.event.startsAt),
                organizerName: dto.event.organizerName,
              },
            }
          : undefined,
      },
      include: { animalDetails: true, eventDetails: true },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        animalDetails: true,
        eventDetails: true,
        location: true,
        author: { select: { id: true, username: true } },
      },
    });
    if (!post) throw new NotFoundException('Post no encontrado');
    return post;
  }

  // Usa la columna "geog" (geography(Point,4326) + indice GIST) creada por
  // prisma/postgis-extensions.sql, en vez de comparar lat/lng en cada fila.
  // Descarta posts vencidos (expiresAt en el pasado) ademas de los ocultos.
  // Pensado para pines de mapa: orden simple por distancia, sin ranking.
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

  // "Feed inteligente" (brief seccion 18): a diferencia de findNearby, no
  // ordena solo por distancia. Combina, con pesos fijos por ahora:
  //   - proximidad (40%): 1 en el punto exacto, 0 en el borde del radio.
  //   - recencia (30%): decae linealmente a 0 en 3 dias (brief seccion 17:
  //     "hace 2 dias puede pasar al historial").
  //   - interaccion (20%): reacciones + comentarios, con techo en 20 para
  //     que un post viral no tape todo lo demas.
  //   - categorias seguidas (10%, bonus aditivo): si el usuario logueado
  //     sigue esa categoria (User.followedCategories).
  // Pesos ajustables aca mismo; no hay A/B testing ni nada mas sofisticado
  // todavia.
  async feed(query: FeedQueryDto, userId?: string) {
    const { lat, lng, radius = 3000, limit = 30 } = query;

    let followedCategories: PostCategory[] = [];
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { followedCategories: true },
      });
      followedCategories = user?.followedCategories ?? [];
    }

    return this.prisma.$queryRaw<FeedPostRow[]>(Prisma.sql`
      SELECT
        p.id, p.category, p.title, p.description, p.lat, p.lng,
        p."authorId", p."createdAt", p."expiresAt",
        dist.distance,
        COALESCE(r.reaction_count, 0)::int AS "reactionCount",
        COALESCE(c.comment_count, 0)::int AS "commentCount",
        (
          GREATEST(0, 1 - dist.distance / ${radius}::float) * 0.4
          + GREATEST(0, 1 - EXTRACT(EPOCH FROM (now() - p."createdAt")) / 86400.0 / 3.0) * 0.3
          + LEAST(1, (COALESCE(r.reaction_count, 0) + COALESCE(c.comment_count, 0)) / 20.0) * 0.2
          + CASE WHEN p.category = ANY(${followedCategories}::"PostCategory"[]) THEN 0.1 ELSE 0 END
        ) AS score
      FROM "Post" p
      CROSS JOIN LATERAL (
        SELECT ST_Distance(p.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance
      ) dist
      LEFT JOIN (
        SELECT "postId", COUNT(*) AS reaction_count
        FROM "Reaction"
        WHERE "postId" IS NOT NULL
        GROUP BY "postId"
      ) r ON r."postId" = p.id
      LEFT JOIN (
        SELECT "postId", COUNT(*) AS comment_count
        FROM "Comment"
        WHERE "postId" IS NOT NULL AND hidden = false
        GROUP BY "postId"
      ) c ON c."postId" = p.id
      WHERE ST_DWithin(
        p.geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )
      AND p.hidden = false
      AND (p."expiresAt" IS NULL OR p."expiresAt" > now())
      ORDER BY score DESC
      LIMIT ${limit};
    `);
  }
}
