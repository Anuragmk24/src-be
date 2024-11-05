import { Module } from '@nestjs/common';
import { AccomodationService } from './accomodation.service';
import { AccomodationController } from './accomodation.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports:[PrismaModule,PaymentModule],
  providers: [AccomodationService],
  controllers: [AccomodationController]
})
export class AccomodationModule {}
