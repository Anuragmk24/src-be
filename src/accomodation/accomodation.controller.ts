import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { AccomodationService } from './accomodation.service';
import { Response } from 'express';

@Controller('accomodation')
export class AccomodationController {
  constructor(private readonly accomodationService: AccomodationService) {}

  @Post('create')
  async createNewAccomodationData(@Body() data: any, @Res() res: Response) {
    try {
      const result =
        await this.accomodationService.createAccomodationData(data);
      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        message: 'accomodation data created successfully',
        data: result,
      });
    } catch (error) {
      console.log('error while creating accomodation data ', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating accomodation',
        error,
      });
    }
  }

  @Post('response')
  async handleAccomodationResponse(@Body() Body, @Res() res: Response) {
    return this.accomodationService.verifyPaymentResponseHash(Body, res);
  }
}
