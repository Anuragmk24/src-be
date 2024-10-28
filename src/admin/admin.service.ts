import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async updateAttendance(userId: any) {
    console.log("userid => ",userId)
    const user = await this.prisma.user.findFirst(userId);

    if (!user) {
      throw new NotFoundException(`User with userId ${userId} not found`);
    }

    const newAttendanceStatus = !user.attended;

    return await this.prisma.user.update({
      where: { id: userId },
      data: { attended:newAttendanceStatus },
    });
  }
}
