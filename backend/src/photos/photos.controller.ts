import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_BYTES },
    }),
  )
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreatePhotoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.photosService.create(req.user.userId, dto, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.photosService.remove(id, req.user.userId);
  }
}
