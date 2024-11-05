import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberType } from '@prisma/client';
import { Response } from 'express';
import { PaymentService } from 'src/payment/payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async createBooking(data: any) {
    try {
      const {
        gstNumber,
        gstBillingAddress,
        isStudentAffiliatedToIia,
        bookingType = 'Individual',
        bringingSpouse,
        accomodation,
        group,
        memberType,
        // need to update later
        paymentMethod = 'sample method',
        amount,
        spouse,
      } = data;

      const newGroup = await this.prisma.group.create({
        data: {
          numberOfMembers:
            memberType === 'STUDENT'
              ? 1
              : memberType === 'NON_IIA_MEMBER'
                ? 1
                : bringingSpouse === 'Yes'
                  ? 2
                  : (group && group.length) || 0,
          createdAt: new Date(),
        },
      });

      // if (existingUsers.length > 0) {
      //   const existingEmails = existingUsers.map((user) => user.email);

      //   // Throw an exception if emails exist
      //   throw new HttpException(
      //     {
      //       statusCode: HttpStatus.BAD_REQUEST,
      //       message: 'Users with the following emails already exist.',
      //       data: { existingEmails },
      //     },
      //     HttpStatus.BAD_REQUEST,
      //   );
      // }
      // Create users for each group member
      const users = await Promise.all(
        group.map(async (member: any) => {
          return this.prisma.user.create({
            data: {
              firstName: member.firstName,
              lastName: member.lastName,
              isStudentAffiliatedToIia: isStudentAffiliatedToIia === 'Yes',
              email: member.email,
              center: member.center,
              collegeName: member.collegeName,
              mobile: member.mobile,
              companyName: member.companyName,
              designation: member.designation,
              country: member.country,
              state: member.state,
              city: member.city,
              pinCode: member.pinCode,
              gstNumber, // common fields
              gstBillingAddress, // common fields
              bookingType, // common fields
              iia: member.iia,
              isBringingSpouse: bringingSpouse === 'Yes', // common fields
              groupSize: group.length, // common fields
              memberType: memberType,
              coaNumber: member.coaNumber,
              fileName: member?.fileName,
            },
          });
        }),
      );
      //creating payment
      const payment = await this.paymentService.createPayment(
        newGroup.id,
        users[0].id,
        amount.regFee + amount.accFee,
        paymentMethod,
        accomodation === 'Yes' ? 'BOTH' : 'REGISTRATION',
      );

      // After users are created, store group member data
      if (group && group.length > 0) {
        const groupMembers = users.map((user, index) => ({
          userId: user.id, // The created user ID
          firstName: group[index].firstName,
          lastName: group[index].lastName,
          email: group[index].email,
          mobile: group[index].mobile,
          groupId: newGroup.id,
        }));

        await this.prisma.groupMember.createMany({
          data: groupMembers,
        });
      }

      // Handle spouse creation if applicable
      if (bringingSpouse === 'Yes') {
        const { spouseFirstName, spouseLastName, spouseEmail, spouseMobile } =
          spouse;

        // Assuming spouse details should be linked to the first created user
        await this.prisma.spouse.create({
          data: {
            userId: users[0].id, // Assuming spouse is linked to the first user
            firstName: spouseFirstName,
            lastName: spouseLastName,
            email: spouseEmail,
            mobile: spouseMobile,
          },
        });
      }

      if (accomodation === 'Yes') {
        //creating accomodation
        const accomodations = await Promise.all(
          users.map((user) => {
            return this.prisma.accomodation.create({
              data: {
                userId: user.id,
                groupId: newGroup?.id || null,
                accommodationConfirmed: true, // set true after payment successful
                createdAt: new Date(),
              },
            });
          }),
        );
      }
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Booking created successfully',
        data: users,
      };
    } catch (error) {
      console.log('Error while booking from service', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error,
          error: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchBookings(start: number, limit: number, search?: string) {
    try {
      const searchFilter = search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { mobile: { contains: search } },
              { iia: { contains: search } },
              { coaNumber: { contains: search } },
              { state: { contains: search } },
              { center: { contains: search } },
              // Assuming memberType is an enum, use a different approach
              {
                payments: {
                  some: {
                    transactionId: { contains: search },
                 
                  },
                },
              },
              {
                payments: {
                  some: {
                    paymentStatus: { contains: search },
                 
                  },
                },
              },
            ],
          }
        : undefined;

      const bookings = await this.prisma.user.findMany({
        skip: Number(start),
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
        where: searchFilter,
        include: {
          payments: true,
          accomodations: true,
          spouse: true,
          groupMmebers: {
            include: {
              group: {
                include: {
                  Payment: true,
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
        bookings,
        totalCount,
      };
    } catch (error) {
      console.log('error fetching bookings ', error);
      throw new Error('Error fetching bookings  ' + error.message);
    }
  }

  async fetchCountOfStudents() {
    try {
      const count = await this.prisma.user.count({
        where: {
          memberType: 'STUDENT',
        },
      });

      // if(!count){
      //   return
      // }
      return count;
    } catch (error) {
      console.log('Error from controller fetching bookings ', error);
      throw new Error('Error fetching bookings ' + error.message);
    }
  }

  async fetchRegisteredUserByTransactionId(transactionId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        transactionId,
        paymentStatus: 'SUCCESS',
        type: 'REGISTRATION',
      },
      include: {
        group: true,
      },
    });
    if (!payment || !payment) {
      throw new NotFoundException('Invalid transaction id');
    }

    if (!payment.groupId) {
      throw new NotFoundException('No group associated with this payment');
    }

    const groupMmbers = await this.prisma.groupMember.findMany({
      where: {
        groupId: payment.groupId,
        // user: {
        //   memberType: 'IIA_MEMBER',
        // },
      },
      include: {
        user: true,
      },
    });
    if (groupMmbers.length === 0) {
      throw new NotFoundException('You are not allowed to book accomodation.');
    }

    return groupMmbers.map((member) => member.user);
  }

  async addAccomodationData(body: any, res: Response) {
    try {
      const newGroup = await this.prisma.group.create({
        data: {
          numberOfMembers: body.length,
          createdAt: new Date(),
        },
      });

      for (const item of body) {
        const groupMembers = await this.prisma.groupMember.create({
          data: {
            groupId: newGroup.id,
            email: item.email,
            firstName: item.firstName,
            lastName: item.lastName,
            mobile: item.mobile,
            createdAt: new Date(),
            userId: item.id,
          },
        });
      }
      const transactionId = `TXN-${newGroup.id}-AMK-${body.length}-${uuidv4()}`;
      const orderId = `ORD-${Date.now()}MK`;

      const newPayment = await this.prisma.payment.create({
        data: {
          paymentMethod: 'Manual',
          paymentStatus: 'SUCCESS',
          transactionId: transactionId,
          type: 'ACCOMMODATION',
          amount:
            body.length === 1
              ? 4000
              : body.length === 2
                ? 8000
                : body.length === 3
                  ? 12000
                  : 16000,
          createdAt: new Date(),
          groupId: newGroup.id ?? null,
          orderId: Number(orderId),
          userId: 3,
        },
      }); // Send success response

      const accomodation = await this.prisma.accomodation.create({
        data: {
          groupId: newGroup.id ?? null,
          accommodationConfirmed: true,
          createdAt: new Date(),
        },
      });

      return res.status(HttpStatus.OK).json({
        message: 'File uploaded successfully',
        group: newGroup,
        payment: newPayment,
        ok: true,
      });
    } catch (error) {
      console.log('error while adding accomodation data', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error while adding accommodation data',
        error: error.message || 'Internal Server Error',
        ok: false,
      });
    }
  }
}
