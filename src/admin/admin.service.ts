import { Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
      console.log(
        'totalregistration count ============> ',
        totalRegistrationCount,
      );
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
}
