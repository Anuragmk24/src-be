import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminPayloadDto } from './dto/adminAuth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('admin/login')
  adminLogin(@Body() authPayload: AdminPayloadDto) {
    return this.authService.adminLogin(authPayload);
  }

  @Post('residencyadmin/login')
  residencyAdminLogin(@Body() authPayload: AdminPayloadDto) {
    return this.authService.residencyAdminLogin(authPayload);
  }
}
