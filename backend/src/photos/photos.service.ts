import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Business } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Mismo criterio que BusinessesService.update: si ya tiene dueño
  // verificado, solo ese dueño edita; si no, quien lo creo.
  private canEditBusiness(business: Business, userId: string) {
    return business.ownerId
      ? business.ownerId === userId
      : business.createdById === userId;
  }

  async create(
    userId: string,
    dto: CreatePhotoDto,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (campo "file")');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se aceptan imagenes JPEG, PNG o WEBP',
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('La imagen no puede superar los 5MB');
    }
    const targetCount = [dto.postId, dto.businessId, dto.productId].filter(
      Boolean,
    ).length;
    if (targetCount !== 1) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId, businessId o productId',
      );
    }

    // Mismo criterio que las demas ediciones (Business.update, Comment.remove):
    // solo quien es dueño del contenido puede agregarle fotos, hasta que
    // exista un flujo mas fino (ej. colaboradores en un reporte de animal).
    if (dto.postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.postId },
      });
      if (!post) throw new NotFoundException('Post no encontrado');
      if (post.authorId !== userId) {
        throw new ForbiddenException(
          'Solo el autor del post puede agregarle fotos',
        );
      }
    } else if (dto.businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: dto.businessId },
      });
      if (!business) throw new NotFoundException('Negocio no encontrado');
      if (!this.canEditBusiness(business, userId)) {
        throw new ForbiddenException(
          'No podés agregarle fotos a este negocio',
        );
      }
    } else {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        include: { business: true },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');
      if (!this.canEditBusiness(product.business, userId)) {
        throw new ForbiddenException(
          'No podés agregarle fotos a este producto',
        );
      }
    }

    const url = await this.storage.upload(file);
    return this.prisma.photo.create({
      data: {
        url,
        postId: dto.postId,
        businessId: dto.businessId,
        productId: dto.productId,
        uploadedById: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    if (photo.uploadedById !== userId) {
      throw new ForbiddenException('No podés borrar esta foto');
    }
    await this.storage.delete(photo.url);
    await this.prisma.photo.delete({ where: { id } });
  }
}
