import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BusinessClaimsService } from './business-claims.service';
import { BusinessClaimsController } from './business-claims.controller';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [BusinessClaimsService],
  controllers: [BusinessClaimsController],
})
export class BusinessClaimsModule {}
