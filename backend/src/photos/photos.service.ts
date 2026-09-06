import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (!!dto.postId === !!dto.businessId) {
      throw new BadRequestException(
        'Debe indicar exactamente uno de postId o businessId',
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
    } else {
      const business = await this.prisma.business.findUnique({
        where: { id: dto.businessId },
      });
      if (!business) throw new NotFoundException('Negocio no encontrado');
      if (business.createdById !== userId) {
        throw new ForbiddenException(
          'Solo quien creó el negocio puede agregarle fotos',
        );
      }
    }

    const url = await this.storage.upload(file);
    return this.prisma.photo.create({
      data: {
        url,
        postId: dto.postId,
        businessId: dto.businessId,
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
