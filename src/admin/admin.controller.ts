import { Body, Controller, Param, Put } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    adminService: AdminService,
  ) {}

  @Put('/toggle-attendee-status/:id')
  async updateAttendance(
    @Param('id') id: number,
    @Body('attended') attended: boolean,
  ) {
    // return this.adminService;
    // return this.adminServ
    // return this.prisma.admin
  }
}
