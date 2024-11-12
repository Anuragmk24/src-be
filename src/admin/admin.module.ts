import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailService } from '@sendgrid/mail';

@Module({
  imports:[PrismaModule],
  controllers: [AdminController],
  providers: [AdminService,MailService]
})
export class AdminModule {}
