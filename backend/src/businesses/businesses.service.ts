import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { NearbyBusinessQueryDto } from './dto/nearby-business-query.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';

interface NearbyBusinessRow {
  id: string;
  category: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
  lat: number;
  lng: number;
  locationId: string | null;
  createdById: string;
  createdAt: Date;
  distance: number;
}

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  create(createdById: string, dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: { ...dto, createdById },
    });
  }

  findMany(query: ListBusinessesDto) {
    const where: Prisma.BusinessWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.locationId) where.locationId = query.locationId;
    return this.prisma.business.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  // Usa la columna "geog" (geography(Point,4326) + indice GIST) creada por
  // prisma/postgis-extensions.sql, igual que posts.findNearby.
  findNearby(query: NearbyBusinessQueryDto) {
    const { lat, lng, radius = 3000, limit = 50, category } = query;
    return this.prisma.$queryRaw<NearbyBusinessRow[]>(Prisma.sql`
      SELECT
        id, category, name, description, address, phone, hours, lat, lng,
        "locationId", "createdById", "createdAt",
        ST_Distance(geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance
      FROM "Business"
      WHERE ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )
      ${category ? Prisma.sql`AND category = ${category}::"BusinessCategory"` : Prisma.empty}
      ORDER BY distance ASC
      LIMIT ${limit};
    `);
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Negocio no encontrado');

    // La "ficha" del negocio (seccion 5 del brief) muestra una calificacion
    // tipo "4.6/5": la calculamos de los Comment con rating, sin necesitar
    // una tabla "reviews" separada.
    const ratingAgg = await this.prisma.comment.aggregate({
      where: { businessId: id, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...business,
      rating: {
        average: ratingAgg._avg.rating,
        count: ratingAgg._count.rating,
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateBusinessDto) {
    const business = await this.findOne(id);
    // Mientras no exista el flujo de "negocio verificado" (roadmap #9),
    // solo quien lo dio de alta puede editarlo.
    if (business.createdById !== userId) {
      throw new ForbiddenException('No podés editar este negocio');
    }
    return this.prisma.business.update({ where: { id }, data: dto });
  }
}
