import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { BookingModule } from './booking/booking.module';
import { PaymentService } from './payment/payment.service';
import { PaymentController } from './payment/payment.controller';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { AccomodationModule } from './accomodation/accomodation.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    BookingModule,
    PaymentModule,
    AdminModule,
    AccomodationModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Path to the uploads folder
      serveRoot: '/api/uploads', // URL prefix to serve files
    }),
  ],
  controllers: [AppController, PaymentController],
  providers: [AppService, PrismaService, PaymentService],
})
export class AppModule {}
