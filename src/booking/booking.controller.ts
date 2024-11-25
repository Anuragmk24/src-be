import {
  Body,
  Controller,
  Post,
  Res,
  HttpStatus,
  Get,
  Query,
  UseInterceptors,
  UploadedFiles,
  Param,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { response, Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import path from 'path';
import * as fs from 'fs';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('create')
  async createBooking(@Body() data: any, @Res() res: Response) {
    try {
      const result = await this.bookingService.createBooking(data);
      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        message: 'Booking created successfully',
        data: result.data,
      });
    } catch (error) {
      console.log('Error while creating booking from controller ', error);

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating booking',
        error,
      });
    }
  }
  @Post('file-upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req: any, file, cb) => {
          cb(null, `${file.originalname}`);
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    try {
      return files[0].filename;
    } catch (error) {
      console.log('error changing name ', error);
    }
  }

  @Get('fetch')
  //need authentication decorator
  async fetchBookings(
    @Query('start') start: number = 0,
    @Query('limit') limit: number = 10,
    @Query('search') search: string,
  ) {
    try {
      const { bookings, totalCount } = await this.bookingService.fetchBookings(
        start,
        limit,
        search,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Bookings retrieved successfully',
        data: {
          bookings,
          totalCount,
        },
      };
    } catch (error) {
      console.log('Error from controller fetching bookings ', error);
      throw new Error('Error fetching bookings ' + error.message);
    }
  }

  @Get('count-students')
  async findCountOfStudents(@Res() res: Response) {
    try {
      const count = await this.bookingService.fetchCountOfStudents();
      return res.status(HttpStatus.OK).json({
        message: 'Count fetch successfully',
        count,
      });
    } catch (error) {
      console.log('Error from controller fetching bookings ', error);
      throw new Error('Error fetching bookings ' + error.message);
    }
  }

  @Get('user/:transactionId')
  async getUserByTransactionId(
    @Param('transactionId') transactionId: string,
    @Res() res: Response,
  ) {
    try {
      const users =
        await this.bookingService.fetchRegisteredUserByTransactionId(
          transactionId,
        );
      // Send response with status 200 and the user data
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User details fetched successfully',
        data: users,
      });
    } catch (error) {
      console.log('in error', error);
      if (error instanceof NotFoundException) {
        // Return 404 error with message
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
        });
      }
      // Handle unexpected errors
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  @Post('accomodation-reciept')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req: any, file, cb) => {
          cb(null, `acc-reciept-${file.originalname}`);
        },
      }),
    }),
  )
  async uploadAccomodationReciept(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const users = JSON.parse(body.users);
      return await this.bookingService.addAccomodationData(users, res);
    } catch (error) {
      console.log('error changing name ', error);
    }
  }

  @Get('checkin/:id')
  async fetchUsersByTransactionId(
    @Param('id') searchTerm: string,
    @Res() res: Response,
  ) {
    try {
      const users =
        await this.bookingService.fetchUsersForCheckin(searchTerm);
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User details fetched successfully',
        data: users,
      });
    } catch (error) {
      console.log('in error', error);
      if (error instanceof NotFoundException) {
        // Return 404 error with message
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
        });
      }
      // Handle unexpected errors
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
