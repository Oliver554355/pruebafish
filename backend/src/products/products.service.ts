import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../photos/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async getEditableBusiness(businessId: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    // Mismo criterio que BusinessesService.update: si ya tiene dueño
    // verificado, solo ese dueño gestiona el menu; si no, quien lo creo.
    const canEdit = business.ownerId
      ? business.ownerId === userId
      : business.createdById === userId;
    if (!canEdit) {
      throw new ForbiddenException('No podés gestionar el menú de este negocio');
    }
    return business;
  }

  async create(userId: string, dto: CreateProductDto) {
    await this.getEditableBusiness(dto.businessId, userId);
    return this.prisma.product.create({
      data: {
        businessId: dto.businessId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
      },
    });
  }

  async findMany(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
      include: { photos: true },
    });
    return Promise.all(
      products.map(async (p) => ({
        ...p,
        photos: await this.storage.signPhotos(p.photos),
      })),
    );
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { photos: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return { ...product, photos: await this.storage.signPhotos(product.photos) };
  }

  async update(id: string, userId: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    await this.getEditableBusiness(product.businessId, userId);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const product = await this.findOne(id);
    await this.getEditableBusiness(product.businessId, userId);
    await this.prisma.product.delete({ where: { id } });
  }
}
