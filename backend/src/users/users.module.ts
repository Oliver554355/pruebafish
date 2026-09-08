import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PhotosModule } from '../photos/photos.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [NotificationsModule, PhotosModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
