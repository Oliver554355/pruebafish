import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessClaimStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessClaimDto } from './dto/create-business-claim.dto';
import { ListBusinessClaimsDto } from './dto/list-business-claims.dto';
import { UpdateBusinessClaimDto } from './dto/update-business-claim.dto';

@Injectable()
export class BusinessClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessClaimDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (business.ownerId) {
      throw new ConflictException('Este negocio ya tiene un dueño verificado');
    }

    const existingPending = await this.prisma.businessClaim.findFirst({
      where: {
        businessId: dto.businessId,
        userId,
        status: BusinessClaimStatus.PENDIENTE,
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'Ya tenés una solicitud pendiente para este negocio',
      );
    }

    return this.prisma.businessClaim.create({
      data: { businessId: dto.businessId, userId, message: dto.message },
    });
  }

  findMany(query: ListBusinessClaimsDto) {
    const where: Prisma.BusinessClaimWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.businessId) where.businessId = query.businessId;
    return this.prisma.businessClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        business: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, moderatorId: string, dto: UpdateBusinessClaimDto) {
    if (dto.status === BusinessClaimStatus.PENDIENTE) {
      throw new BadRequestException('status debe ser APROBADO o RECHAZADO');
    }
    const claim = await this.prisma.businessClaim.findUnique({
      where: { id },
    });
    if (!claim) throw new NotFoundException('Solicitud no encontrada');
    if (claim.status !== BusinessClaimStatus.PENDIENTE) {
      throw new ConflictException('Esta solicitud ya fue resuelta');
    }

    if (dto.status === BusinessClaimStatus.RECHAZADO) {
      return this.prisma.businessClaim.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedById: moderatorId,
          reviewedAt: new Date(),
        },
      });
    }

    // Aprobar: asigna el dueño verificado y, ya que solo puede haber uno,
    // rechaza de paso cualquier otra solicitud pendiente para ese negocio.
    // Transaccion para que las tres escrituras queden todas o ninguna.
    const [, updatedClaim] = await this.prisma.$transaction([
      this.prisma.business.update({
        where: { id: claim.businessId },
        data: { ownerId: claim.userId, verified: true },
      }),
      this.prisma.businessClaim.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedById: moderatorId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.businessClaim.updateMany({
        where: {
          businessId: claim.businessId,
          status: BusinessClaimStatus.PENDIENTE,
          id: { not: id },
        },
        data: {
          status: BusinessClaimStatus.RECHAZADO,
          reviewedById: moderatorId,
          reviewedAt: new Date(),
        },
      }),
    ]);
    return updatedClaim;
  }
}
