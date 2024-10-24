import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('request')
  generatePaymentHash(@Body() body, @Res() res: Response) {
    const hash = this.paymentService.generatePaymentHash(body);
    res.json({ api_key: 'fb6bca86-b429-4abf-a42f-824bdd29022e', hash });
  }
  @Post('response')
  async handlePaymentResponse(@Body() body, @Res() res: Response) {
    return this.paymentService.verifyPaymentResponseHash(body, res);

    // if (isValidHash) {
    //   if (body['response_code'] === '0') {
    //     return res.json({
    //       status: 'success',
    //       message: body['response_message'],
    //       transaction_id: body['transaction_id'],
    //       amount: body['amount'],
    //     });
    //   } else {
    //     return res.json({
    //       status: 'failed',
    //       message: body['response_message'],
    //     });
    //   }
    // } else {
    //   return res.json({
    //     status: 'failed',
    //     message: 'Hash Mismatch',
    //   });
    // }
  }

  @Get('verify-response')
  async verifyPaymentResponse(
    @Query('transactionId') transactionId,
    @Res() res: Response,
  ) {
    return this.paymentService.verifyResponse(transactionId, res);
  }
}
