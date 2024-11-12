import {
  Body,
  Controller,
  Param,
  Put,
  NotFoundException,
  Res,
  HttpStatus,
  Get,
  Post,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Response } from 'express';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Put('/toggle-attendee-status/:id')
  async updateAttendance(
    @Param('id') id: string,

    @Res() res: Response,
  ) {
    try {
      const response: any = await this.adminService.updateAttendance(
        Number(id),
      );
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Attendee status changed',
        data: response.data,
      });
    } catch (error) {
      // Handle the case where the user is not found
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error changing attendee status',
        error,
      });
    }
  }

  @Get('/dashbord-data-counts')
  async fetchDashbordData(@Res() res: Response) {
    try {
      const counts = await this.adminService.fetchDashbordCounts(res);
      return res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data',
      });
    }
  }

  @Post('/send-email')
  async sendEmail(@Body() body:any, @Res() res:Response){
    try {
      return await this.adminService.sendEmail(body,res)
    } catch (error) {
      return res.status(500).json({
        success:false,
        message:'Error sending email'
      })
    }
  }
}
