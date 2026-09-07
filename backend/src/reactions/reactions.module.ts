import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReactionsService } from './reactions.service';
import { ReactionsController } from './reactions.controller';

@Module({
  imports: [NotificationsModule],
  providers: [ReactionsService],
  controllers: [ReactionsController],
})
export class ReactionsModule {}
