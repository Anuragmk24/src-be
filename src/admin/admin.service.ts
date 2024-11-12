import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { MailService } from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private config: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.mailService.setApiKey(this.config.get('SENDGRID_API_KEY'));
  }
  async generateQrCode(transaction_id: string): Promise<string> {
    try {
      const qrcodeUrl = await QRCode.toDataURL(transaction_id);
      return qrcodeUrl;
    } catch (error) {
      console.log('Error generating QR Code:', error);
      throw new Error('Could not generate QR code');
    }
  }
  async updateAttendance(userId: any) {
    console.log('userid => ', userId);
    const user = await this.prisma.user.findFirst(userId);

    if (!user) {
      throw new NotFoundException(`User with userId ${userId} not found`);
    }

    const newAttendanceStatus = !user.attended;

    return await this.prisma.user.update({
      where: { id: userId },
      data: { attended: newAttendanceStatus },
    });
  }

  async fetchDashbordCounts(res: Response) {
    try {
      const totalRegistrationCount = await this.prisma.payment.count({
        where: {
          paymentStatus: 'SUCCESS',
        },
      });

      const totalAttendeeCount = await this.prisma.user.count({
        where: {
          attended: true,
        },
      });
      const totalPayments = await this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          paymentStatus: 'SUCCESS',
        },
      });
      const totalPaymentAmount = totalPayments._sum.amount || 0;

      const totalpendingPayment = await this.prisma.payment.count({
        where: {
          paymentStatus: 'PENDING',
        },
      });
      return res.status(200).json({
        success: true,
        data: {
          totalRegistrationCount,
          totalAttendeeCount,
          totalPaymentAmount,
          totalpendingPayment,
        },
      });
    } catch (error) {
      console.log('error ===========> ', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data',
      });
    }
  }

  async sendEmail(body: any, res: Response) {
    try {
      const qrUrl = await this.generateQrCode(body?.payload?.transactionId);

      const [response] = await this.sendBookingResonseEmail(
        body?.payload?.name,
        body?.payload?.email,
        body?.payload?.transactionId,
        qrUrl,
        true,
      );
      if (response.statusCode === 202) {
        res
          .status(HttpStatus.OK)
          .json({ success: true, message: 'Email send successfully' });
      } else {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to send email',
          error: response?.message || 'Unknown error',
        });
      }
    } catch (error) {
      console.log('error sending email ', error);
      return res.status(500).json({
        success: false,
        message: 'Error sending email',
        error: error,
      });
    }
  }

  async sendBookingResonseEmail(
    userName: String,
    userEmail: string,
    transactionId: string,
    qrcodeUrl: String,
    status: boolean,
  ) {
   
    try {
      if (userName && userEmail && transactionId && qrcodeUrl) {
        const filePath = join(
          process.cwd(),
          'src',
          'mail_template',
          'bookingEmail.hbs',
        );

        const source = fs.readFileSync(filePath, 'utf-8').toString();
        const template = handlebars.compile(source);
        const emailData = {
          userName,
          userEmail,
          transactionId,
          qrcodeUrl,
          status,
        };

        const htmlToSend = template(emailData);
        let mailOptions = {
          from: process.env.MAIL_USERNAME,
          to: userEmail,
          subject: 'SRC Registration',
          text: 'Welcome to SRC',
          html: htmlToSend,
        };

        const response = await this.mailService.send(mailOptions);
        return response;
      } else {
        console.log('email did not send!!!');
        throw new Error('Required data missing');
      }
    } catch (error) {
      console.log('error sending email ', error);
      return error;
    }
  }
}
