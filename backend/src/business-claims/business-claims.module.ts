import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessClaimsService } from './business-claims.service';
import { BusinessClaimsController } from './business-claims.controller';

@Module({
  imports: [AuthModule],
  providers: [BusinessClaimsService],
  controllers: [BusinessClaimsController],
})
export class BusinessClaimsModule {}
