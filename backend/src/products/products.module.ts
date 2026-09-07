import { Module } from '@nestjs/common';
import { PhotosModule } from '../photos/photos.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [PhotosModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
