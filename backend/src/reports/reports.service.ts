import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';
import { UpdateReportDto } from './dto/update-report.dto';

function countTargets(dto: {
  postId?: string;
  businessId?: string;
  commentId?: string;
}) {
  return [dto.postId, dto.businessId, dto.commentId].filter(Boolean).length;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  create(reporterId: string, dto: CreateReportDto) {
    if (countTargets(dto) !== 1) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId, businessId o commentId',
      );
    }
    return this.prisma.report.create({
      data: {
        reason: dto.reason,
        description: dto.description,
        reporterId,
        postId: dto.postId,
        businessId: dto.businessId,
        commentId: dto.commentId,
      },
    });
  }

  findMany(query: ListReportsDto) {
    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status;
    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { reporter: { select: { id: true, username: true } } },
    });
  }

  async update(id: string, moderatorId: string, dto: UpdateReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    if (dto.hideContent) {
      if (report.postId) {
        await this.prisma.post.update({
          where: { id: report.postId },
          data: { hidden: true },
        });
      } else if (report.businessId) {
        await this.prisma.business.update({
          where: { id: report.businessId },
          data: { hidden: true },
        });
      } else if (report.commentId) {
        await this.prisma.comment.update({
          where: { id: report.commentId },
          data: { hidden: true },
        });
      }
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: moderatorId,
        reviewedAt: new Date(),
      },
    });
  }
}
