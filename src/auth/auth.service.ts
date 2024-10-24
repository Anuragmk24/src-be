import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminPayloadDto } from './dto/adminAuth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async adminLogin({ username, password }: AdminPayloadDto) {
    try {
      const findUser: any = await this.prisma.admin.findFirst({
        where: {
          email: username,
        },
      });

      if (!findUser) {
        throw new UnauthorizedException('Invalid email');
      }

      const isPasswordValid = await bcrypt.compare(password, findUser.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }

      const token = this.jwtService.sign({id:findUser.id,role:findUser.role});

      return {
        message: 'Admin validated',
        admin: findUser,
        token,
        ok: true,
      };
    } catch (error) {
      console.log('Error login super admin ', error);
      // Handle different types of errors
      if (error instanceof UnauthorizedException) {
        throw error; // Will automatically return 401 and the provided message
      }

      // For unexpected errors, throw an InternalServerErrorException
      throw new InternalServerErrorException(
        'An error occurred during authentication',
      );
    }
  }
  async validateAdmin(payload: any) {
    try {
      const { userId } = payload;

      const superAdmin = await this.prisma.admin.findFirst({
        where: {
          id: userId,
        },
      });
      return superAdmin;
    } catch (error) {
      console.log('Error while validating super admin');
    }
  }
}
