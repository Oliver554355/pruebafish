import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { LocationsModule } from './locations/locations.module';
import { BusinessesModule } from './businesses/businesses.module';
import { CommentsModule } from './comments/comments.module';
import { ReactionsModule } from './reactions/reactions.module';
import { ReportsModule } from './reports/reports.module';
import { PhotosModule } from './photos/photos.module';
import { BusinessClaimsModule } from './business-claims/business-claims.module';
import { SavedModule } from './saved/saved.module';
import { ProductsModule } from './products/products.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    LocationsModule,
    BusinessesModule,
    CommentsModule,
    ReactionsModule,
    ReportsModule,
    PhotosModule,
    BusinessClaimsModule,
    SavedModule,
    ProductsModule,
    NotificationsModule,
    SearchModule,
  ],
})
export class AppModule {}
