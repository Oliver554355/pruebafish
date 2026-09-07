import { Module } from '@nestjs/common';
import { PhotosModule } from '../photos/photos.module';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';

@Module({
  imports: [PhotosModule],
  providers: [BusinessesService],
  controllers: [BusinessesController],
})
export class BusinessesModule {}
