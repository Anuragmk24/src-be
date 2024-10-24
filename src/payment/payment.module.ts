import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '@sendgrid/mail';

@Module({
  providers: [PaymentService, PrismaService, MailService],
  exports: [PaymentService, MailService],
})
export class PaymentModule {}
