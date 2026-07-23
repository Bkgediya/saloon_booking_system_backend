import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'super-secret-key-change-me-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const { sub, role } = payload;

    if (role === 'BUSINESS_OWNER') {
      const owner = await this.prisma.businessOwner.findUnique({
        where: { id: sub },
      });
      if (!owner) {
        throw new UnauthorizedException('Invalid token: owner not found');
      }
      const { passwordHash, ...result } = owner;
      return { ...result, role };
    } else if (role === 'CUSTOMER') {
      const customer = await this.prisma.customer.findUnique({
        where: { id: sub },
      });
      if (!customer) {
        throw new UnauthorizedException('Invalid token: customer not found');
      }
      const { passwordHash, ...result } = customer;
      return { ...result, role };
    }

    throw new UnauthorizedException('Invalid token role');
  }
}
