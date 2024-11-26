import { HttpStatus, Injectable } from '@nestjs/common';
import { PaymentType, Payment, User } from '@prisma/client';
import * as crypto from 'crypto';
import { Response } from 'express';
import { join } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { ConfigService } from '@nestjs/config';
import { MailService } from '@sendgrid/mail';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
const axios = require('axios');

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.mailService.setApiKey(this.config.get('SENDGRID_API_KEY'));
  }
  // private readonly API_KEY = 'fb6bca86-b429-4abf-a42f-824bdd29022e';
  // private readonly SALT = '80c67bfdf027da08de88ab5ba903fecafaab8f6d';
  private readonly API_KEY = process.env.OMNIWARE_API_KEY;
  private readonly SALT = process.env.OMNIWARE_SALT;

  async generateQrCode(transaction_id: string): Promise<string> {
    try {
      const qrcodeUrl = await QRCode.toDataURL(transaction_id);
      return qrcodeUrl;
    } catch (error) {
      console.log('Error generating QR Code:', error);
      throw new Error('Could not generate QR code');
    }
  }

  //generate payment hash for omniware request
  generatePaymentHash(reqData: any): string {
    try {
      const shasum = crypto.createHash('sha512');
      let hash_data = this.SALT;

      const hashColumns = [
        'address_line_1',
        'address_line_2',
        'amount',
        'api_key',
        'city',
        'country',
        'currency',
        'description',
        'email',
        'mode',
        'name',
        'order_id',
        'phone',
        'return_url',
        'state',
        'udf1',
        'udf2',
        'udf3',
        'udf4',
        'udf5',
        'zip_code',
      ];

      reqData['api_key'] = this.API_KEY;
      hashColumns.forEach((entry) => {
        if (reqData[entry]) {
          hash_data += '|' + reqData[entry];
        }
      });

      const resultKey = shasum.update(hash_data).digest('hex').toUpperCase();
      return resultKey;
    } catch (error) {
      console.log('error generate payment ', error);
    }
  }

  async verifyPaymentResponseHash(reqData: any, res: Response) {
    console.log('reqdata ============> ', reqData);
    try {
      const shashum = crypto.createHash('sha512');
      let hash_data = this.SALT;

      const keys = Object.keys(reqData);

      var i: number,
        len = keys.length;
      keys.sort();

      for (i = 0; i < len; i++) {
        var k = keys[i];
        if (k != 'hash') {
          reqData[k] = reqData[k].toString();
          if (reqData[k].length > 0) {
            hash_data += '|' + reqData[k];
          }
        }
      }
      const calculated_hash = shashum
        .update(hash_data)
        .digest('hex')
        .toUpperCase();

      console.log(
        'reqData?.hash == calculated_hash ',
        reqData?.hash == calculated_hash,
      );
      if (reqData?.hash == calculated_hash) {
        const user: any = await this.prisma.user.findFirst({
          where: {
            email: reqData['email'],
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (!user) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .json({ message: 'User not found' });
        }

        const groupMmber: any = await this.prisma.groupMember.findMany({
          where: {
            userId: user.id,
          },
        });

        const groupMembers: any = await this.prisma.groupMember.findMany({
          where: {
            groupId: groupMmber[0].groupId,
          },
          include: { user: true },
        });

        if (groupMembers.length === 0) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .json({ message: 'No group members found' });
        }

        const payment = await this.prisma.payment.findFirst({
          where: {
            userId: user.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        console.log('payment', payment);

        if (payment) {
          console.log('in payment');
          const paymentUpdate = await this.prisma.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              amount: parseFloat(reqData['amount']),
              paymentStatus:
                reqData['response_code'] === '0'
                  ? 'SUCCESS'
                  : reqData['response_code'] === '1000'
                    ? 'FAILED'
                    : 'PENDING',
              transactionId: reqData['transaction_id'],
              paymentMethod: reqData['payment_mode'],
              orderId: reqData['orderId'],
            },
          });
        } else {
          console.log('payment record not found');
        }
        const qrUrl = await this.generateQrCode(reqData?.transaction_id);
        if (reqData['response_code'] == 0) {
          for (const member of groupMembers) {
            const response = await this.sendBookingResonseEmail(
              member.user.firstName,
              member.user.email,
              reqData?.transaction_id,
              qrUrl,
              reqData['response_code'] === '0',
            );
            console.log('response after booking ', response);
          }
          return res.redirect(
            `${process.env.NEXT_PUBLIC_SELF_URL}/payment/result?status=${reqData['response_code'] === '0' ? 'SUCCESS' : 'FAILED'}&transaction_id=${reqData['transaction_id']}`,
          );
        } else if (reqData['response_code'] === '1000') {
          //need to send failed email to users
          const response = await this.sendBookingResonseEmail(
            reqData?.name,
            reqData?.email,
            reqData?.transaction_id,
            qrUrl,
            false,
          );
          console.log('response after booking ', response);

          return res.redirect(
            `${process.env.NEXT_PUBLIC_SELF_URL}/payment/result?status=${reqData['response_code'] === '0' ? 'SUCCESS' : 'FAILED'}&transaction_id=${reqData['transaction_id']}`,
          );
        } else {
          console.log('unknown resopsnse');
          return res.redirect(
            `${process.env.NEXT_PUBLIC_SELF_URL}/payment/result?status=PENDING&transaction_id=${reqData['transaction_id']}`,
          );
        }
      } else {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ message: 'Hash mismatch' });
      }
    } catch (error) {
      console.log('Errror respone ', error);
    }
  }

  async createPayment(
    groupId: number,
    userId: number,
    amount: number,
    paymentMethod: string,
    type: PaymentType,
  ): Promise<Payment> {
    try {
      const transactionId = `TXN${uuidv4()}MK`;

      const newPayment = await this.prisma.payment.create({
        data: {
          userId, // Ensure this matches the type (number)
          amount: amount, // E nsure this is a valid Decimal
          paymentMethod, // String (e.g., "Credit Card", "PayPal")
          paymentStatus: 'PENDING', // String status, e.g., "Pending"
          groupId: groupId,
          transactionId: transactionId, // Optional for now, can be filled later

          type, // Ensure this matches the PaymentType enum
        },
      });

      return newPayment;
    } catch (error) {
      throw new Error('Error creating payment: ' + error.message);
    }
  }

  async verifyResponse(transactionId: string, res: Response) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: {
          transactionId: transactionId,
        },
      });

      if (!payment) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Payment not found for the given transaction ID.',
        });
      }

      return res.status(HttpStatus.OK).json(payment);
    } catch (error) {
      console.log('error while fetching payment response');
    }
  }

  async sendBookingResonseEmail(
    userName: String,
    userEmail: string,
    transactionId: string,
    qrcodeUrl: String,
    status: boolean, //success or fail
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

  //hash generation with phonenumber for payment status check api

  //payment status check api
  async computeHash(params) {
    try {
      const shasum = crypto.createHash('sha512');
      let hash_data = this.SALT;

      console.log('hashdata pre ', hash_data);
      const hashColumns = ['customer_phone'];

      hashColumns.forEach((entry) => {
        if (params[entry]) {
          hash_data += '|' + params[entry] + '|' + this.API_KEY;
        }
      });

      console.log('hashdata ', hash_data);
      const resultKey = shasum.update(hash_data).digest('hex').toUpperCase();
      return resultKey;
    } catch (error) {
      console.log('error generate payment ', error);
    }
  }

  async chckPaymentStatus(phoneNumber: string) {
    try {
      const hash = this.generatePaymentHash({
        api_key: this.API_KEY,
        phone: phoneNumber,
        salt: this.SALT,
      })
      const response = await axios.post(
        'https://pgbiz.omniware.in/v2/paymentstatus',
        {
          api_key: this.API_KEY,
          customer_phone: phoneNumber,
          hash,
        },
      );
      return response?.data;
    } catch (error) {
      console.error(`api call failed:`, error.message);
    }
  }

  async fetchFailedTransactionAndCheckPaymentStatus() {
    try {
      const failedPayments = await this.prisma.payment.findMany({
        where: {
          paymentStatus: {
            in: ['FAILED', 'PENDING'],
          },
        },
        include: {
          user: true,
        },
      });

      // console.log('failedPayments', failedPayments);
      for (const payment of failedPayments) {
        const { userId, id: paymentId, user } = payment;

        if (!user || !user.mobile) {
          console.log(
            `Skipping payment ID ${paymentId}: User or phone number not found.`,
          );
          continue;
        }
        console.log(
          `Checking status for user ID: ${userId}, phone: ${user.mobile}`,
        );
        const paymentResponse = await this.chckPaymentStatus(user.mobile);
        console.log('paymentResopnse.data', paymentResponse?.data);

        if (paymentResponse?.data && Array.isArray(paymentResponse.data)) {
          const isSuccessful = paymentResponse.data.some(
            (item) => item.response_code === 0,
          );

          console.log('issuccessfull ', isSuccessful);
          if (isSuccessful) {
            console.log(
              `Payment ID ${paymentId} is successful. Updating status...`,
            );

            const updatedAt = new Date(Date.now()).toISOString(); // Get current timestamp and convert to ISO-8601 string

            const paymentUpdate = await this.prisma.payment.update({
              where: { id: paymentId },
              data: {
                paymentStatus: paymentResponse?.data?.[0]?.response_message,
                updatedAt: updatedAt,
                transactionId:paymentResponse?.data?.[0]?.transaction_id,
                paymentMethod:paymentResponse?.data?.[0]?.payment_mode
              },
            });
            console.log('paymentUpdate', paymentUpdate);
          } else {
            console.log(
              `Payment ID ${paymentId} remains ${payment.paymentStatus}.`,
            );
          }
        } else {
          console.log(
            'Unexpected paymentResponse data format',
            paymentResponse,
          );
        }
      }
      console.log('failedusers length', failedPayments.length);
    } catch (error) {
      console.log('error while payment status check', error);
    }
  }
}
