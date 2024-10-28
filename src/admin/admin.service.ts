import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async updateAttendance(id: any, attended: boolean) {
    const user = await this.prisma.user.findFirst(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return await this.prisma.user.update({
      where: { id },
      data: { attended },
    });
  }
}
