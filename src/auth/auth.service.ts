import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private async checkEmailUnique(email: string): Promise<void> {
    const owner = await this.prisma.businessOwner.findUnique({
      where: { email },
    });
    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });
    if (owner || customer) {
      throw new ConflictException('Email is already in use');
    }
  }

  async registerBusinessOwner(dto: RegisterDto) {
    await this.checkEmailUnique(dto.email);
    const passwordHash = await this.hashPassword(dto.password);

    const owner = await this.prisma.businessOwner.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    const { passwordHash: _, ...result } = owner;
    return result;
  }

  async loginBusinessOwner(dto: LoginDto) {
    const owner = await this.prisma.businessOwner.findUnique({
      where: { email: dto.email },
    });

    if (!owner) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, owner.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: owner.id,
      email: owner.email,
      role: 'BUSINESS_OWNER',
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: 'BUSINESS_OWNER',
      },
    };
  }

  async registerCustomer(dto: RegisterDto) {
    await this.checkEmailUnique(dto.email);
    const passwordHash = await this.hashPassword(dto.password);

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    const { passwordHash: _, ...result } = customer;
    return result;
  }

  async loginCustomer(dto: LoginDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: customer.id,
      email: customer.email,
      role: 'CUSTOMER',
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: 'CUSTOMER',
      },
    };
  }
}
