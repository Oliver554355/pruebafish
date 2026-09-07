import { Module } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';
import { StorageService } from './storage.service';

@Module({
  providers: [PhotosService, StorageService],
  controllers: [PhotosController],
  exports: [StorageService],
})
export class PhotosModule {}
