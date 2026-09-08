import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../photos/storage.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { NearbyBusinessQueryDto } from './dto/nearby-business-query.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';

export interface NearbyBusinessRow {
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
  ownerId: string | null;
  verified: boolean;
  createdAt: Date;
  distance: number;
}

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  create(createdById: string, dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: { ...dto, createdById },
    });
  }

  findMany(query: ListBusinessesDto) {
    const where: Prisma.BusinessWhereInput = { hidden: false };
    if (query.category) where.category = query.category;
    if (query.locationId) where.locationId = query.locationId;
    return this.prisma.business.findMany({
      where,
      // Los verificados van primero; adentro de cada grupo, alfabetico.
      orderBy: [{ verified: 'desc' }, { name: 'asc' }],
    });
  }

  findMine(userId: string) {
    return this.prisma.business.findMany({
      where: {
        hidden: false,
        OR: [{ createdById: userId }, { ownerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Usa la columna "geog" (geography(Point,4326) + indice GIST) creada por
  // prisma/postgis-extensions.sql, igual que posts.findNearby.
  findNearby(query: NearbyBusinessQueryDto) {
    const { lat, lng, radius = 3000, limit = 50, offset = 0, category } = query;
    return this.prisma.$queryRaw<NearbyBusinessRow[]>(Prisma.sql`
      SELECT
        id, category, name, description, address, phone, hours, lat, lng,
        "locationId", "createdById", "ownerId", verified, "createdAt",
        ST_Distance(geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance
      FROM "Business"
      WHERE ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )
      AND hidden = false
      ${category ? Prisma.sql`AND category = ${category}::"BusinessCategory"` : Prisma.empty}
      ORDER BY verified DESC, distance ASC
      LIMIT ${limit}
      OFFSET ${offset};
    `);
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { photos: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');

    // La "ficha" del negocio (seccion 5 del brief) muestra una calificacion
    // tipo "4.6/5": la calculamos de los Comment con rating, sin necesitar
    // una tabla "reviews" separada.
    const ratingAgg = await this.prisma.comment.aggregate({
      where: { businessId: id, rating: { not: null }, hidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...business,
      photos: await this.storage.signPhotos(business.photos),
      rating: {
        average: ratingAgg._avg.rating,
        count: ratingAgg._count.rating,
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateBusinessDto) {
    const business = await this.findOne(id);
    // Si ya tiene dueño (auto-verificado, ver verify() abajo), solo ese
    // dueño puede editar. Sin verificar todavia, manda quien lo dio de alta.
    const canEdit = business.ownerId
      ? business.ownerId === userId
      : business.createdById === userId;
    if (!canEdit) {
      throw new ForbiddenException('No podés editar este negocio');
    }
    return this.prisma.business.update({ where: { id }, data: dto });
  }

  // Autoverificacion: sin moderador de por medio, el creador (o el dueño
  // ya asignado) confirma que administra el point. Evita el ida-y-vuelta
  // de esperar una aprobacion para poder cargar el menu/fotos.
  async verify(id: string, userId: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    const canVerify = business.ownerId
      ? business.ownerId === userId
      : business.createdById === userId;
    if (!canVerify) {
      throw new ForbiddenException('No podés verificar este negocio');
    }
    if (business.verified) return business;
    return this.prisma.business.update({
      where: { id },
      data: { verified: true, ownerId: business.ownerId ?? userId },
    });
  }
}
