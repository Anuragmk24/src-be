import {
  Body,
  Controller,
  Param,
  Put,
  NotFoundException,
  Res,
  HttpStatus,
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
}
