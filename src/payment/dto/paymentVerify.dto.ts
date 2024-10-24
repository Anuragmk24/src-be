// src/payment/dto/payment-status.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentStatusDto {
  @IsNotEmpty()
  @IsString()
  transaction_id: string;
}
