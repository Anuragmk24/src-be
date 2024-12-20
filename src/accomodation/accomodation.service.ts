import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PaymentService } from 'src/payment/payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import { Response } from 'express';
import { join } from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as QRCode from 'qrcode';
import { MailService } from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccomodationService {
  constructor(
    private prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private config: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.mailService.setApiKey(this.config.get('SENDGRID_API_KEY'));
  }

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
  async createAccomodationData(data: any) {
    try {
      const userIds = data.payload.map((user: any) => user.id);

      // Find existing group with any of the users
      const existingGroup = await this.prisma.group.findFirst({
        where: {
          GroupMember: {
            some: {
              userId: {
                in: userIds,
              },
            },
          },
        },
        include: {
          GroupMember: {
            select: {
              user: true,
            },
          },
          Accomodation: true,
        },
      });

      let groupId: any;
      let groupMembers: any;

      // Check if all users are in the existing group
      const allUsersInGroup =
        existingGroup &&
        userIds.every((userId: any) =>
          existingGroup.GroupMember.some(
            (member: any) => member.user.id === userId,
          ),
        );

      if (existingGroup && allUsersInGroup) {
        groupId = existingGroup.id;
        groupMembers = existingGroup.GroupMember;

        await this.prisma.payment.create({
          data: {
            groupId: groupId,
            amount: data.amount,
            paymentMethod: '',
            paymentStatus: 'PENDING',
            transactionId: new Date().toString(),
            type: 'ACCOMMODATION',
            createdAt: new Date(),
            orderId: 123,
            userId: userIds[0],
          },
        });

        await this.prisma.accomodation.create({
          data: {
            groupId: groupId,
            accommodationConfirmed: false,
            createdAt: new Date(),
          },
        });
      } else {
        console.log(
          'Creating new group as not all users are in a single group.',
        );

        const newGroup = await this.prisma.group.create({
          data: {
            numberOfMembers: userIds.length,
            GroupMember: {
              create: data.payload.map((user: any) => ({
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                mobile: user.mobile,
                createdAt: new Date(),
              })),
            },
            createdAt: new Date(),
          },
          include: {
            GroupMember: {
              select: {
                user: true,
              },
            },
          },
        });

        groupId = newGroup.id;
        groupMembers = newGroup.GroupMember;

        await this.prisma.payment.create({
          data: {
            groupId: groupId,
            paymentMethod: '',
            paymentStatus: 'PENDING',
            transactionId: new Date().toString(),
            type: 'ACCOMMODATION',
            amount: data.amount,
            createdAt: new Date(),
            orderId: 213,
            userId: userIds[0],
          },
        });

        await this.prisma.accomodation.create({
          data: {
            groupId: groupId,
            accommodationConfirmed: false,
            createdAt: new Date(),
          },
        });
      }

      return {
        groupId,
        groupMembers,
      };
    } catch (error) {
      console.log('error while create accommodation from service page ', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || error,
          error: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyPaymentResponseHash(reqData: any, res: Response) {
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

        const accomodationUpdate = await this.prisma.accomodation.updateMany({
          where: {
            groupId: groupMmber[0].groupId,
          },
          data: {
            accommodationConfirmed:
              reqData['response_code'] === '0' ? true : false,
          },
        });

        if (groupMembers.length === 0) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .json({ message: 'No group members found' });
        }

        const payment = await this.prisma.payment.findFirst({
          where: {
            userId: user.id,
            type: 'ACCOMMODATION',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (payment) {
          const paymentUpdate = await this.prisma.payment.update({
            where: {
              id: payment.id,
              type: 'ACCOMMODATION',
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
          }
          return res.redirect(
            `${process.env.NEXT_PUBLIC_SELF_URL}/payment/accomodation/result?status=${reqData['response_code'] === '0' ? 'SUCCESS' : 'FAILED'}&transaction_id=${reqData['transaction_id']}`,
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
          return res.redirect(
            `${process.env.NEXT_PUBLIC_SELF_URL}/payment/accomodation/result?status=${reqData['response_code'] === '0' ? 'SUCCESS' : 'FAILED'}&transaction_id=${reqData['transaction_id']}`,
          );
        } else {
          return res.redirect(
            `${process.env.NEXT_PUBLIC_SELF_URL}/payment/accomodation/result?status=PENDING&transaction_id=${reqData['transaction_id']}`,
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
          'accomodationEmail.hbs',
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

  async getTotalMembersWithAccomodation() {
    try {
      const groupsWithRegistration = await this.prisma.payment.findMany({
        where: {
          paymentStatus: 'SUCCESS',
          type: {
            in: ['BOTH', 'REGISTRATION'],
          },
        },
        select: {
          groupId: true,
        },
        distinct: ['groupId'],
      });

      let registeredCount = 0;
      for (const group of groupsWithRegistration) {
        const groupData = await this.prisma.group.findUnique({
          where: { id: group.groupId! },
          select: { numberOfMembers: true },
        });
        registeredCount += groupData?.numberOfMembers ?? 0;
      }

      const groupsWithAccomodation = await this.prisma.payment.findMany({
        where: {
          paymentStatus: 'SUCCESS',
          type: {
            in: ['ACCOMMODATION', 'BOTH'],
          },
        },
        select: {
          groupId: true,
        },
        distinct: ['groupId'],
      });

      let groupMembersCount = 0;
      for (const group of groupsWithAccomodation) {
        const groupData = await this.prisma.group.findUnique({
          where: { id: group.groupId! },
          select: { numberOfMembers: true },
        });

        groupMembersCount += groupData?.numberOfMembers ?? 0;
      }

      return {
        totalRegistration: registeredCount,
        totalAccomodation: groupMembersCount,
      };
    } catch (error) {
      console.log('error fetching members with accomodation ', error);
      throw error;
    }
  }

  async fetchAccomodationDetails(
    start: number,
    limit: number,
    search?: string,
  ) {
    try {
      const accommodation = await this.prisma.user.findMany({
        skip: Number(start),
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          payments: {
            some: {
              type: {
                in: ['ACCOMMODATION', 'BOTH'],
              },
            },
          },
          ...(search && {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { mobile: { contains: search } },
              { iia: { contains: search } },
              { coaNumber: { contains: search } },
              { state: { contains: search } },
              { center: { contains: search } },
              {
                payments: {
                  some: {
                    transactionId: { contains: search },
                  },
                },
              },
            ],
          }),
        },
        include: {
          payments: {
            where: {
              type: {
                in: ['ACCOMMODATION', 'BOTH'],
              },
              paymentStatus:"SUCCESS"
            },
          },
          accomodations: true,
          spouse: true,
          groupMmebers: {
            include: {
              group: {
                include: {
                  Payment: {
                    where: {
                      type: {
                        in: ['ACCOMMODATION', 'BOTH'],
                      },
                      paymentStatus:"SUCCESS"

                    },
                  },
                  Accomodation: {
                    select: {
                      accommodationConfirmed: true,
                      groupId: true,
                    },
                  },
                  GroupMember: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      const totalCount = await this.prisma.user.count();

      return {
        accommodation,
        totalCount,
      };
    } catch (error) {
      console.log('error fetching accomodation ', error);

      throw new Error('Error fetching accomodation  ' + error.message);
    }
  }
}
