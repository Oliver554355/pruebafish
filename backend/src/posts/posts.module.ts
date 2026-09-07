import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PhotosModule } from '../photos/photos.module';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [NotificationsModule, PhotosModule],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
