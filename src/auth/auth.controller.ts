import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('business/register')
  @ResponseMessage('Business owner registered successfully')
  async registerBusiness(@Body() dto: RegisterDto) {
    return this.authService.registerBusinessOwner(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('business/login')
  @ResponseMessage('Business owner logged in successfully')
  async loginBusiness(@Body() dto: LoginDto) {
    return this.authService.loginBusinessOwner(dto);
  }

  @Post('customer/register')
  @ResponseMessage('Customer registered successfully')
  async registerCustomer(@Body() dto: RegisterDto) {
    return this.authService.registerCustomer(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('customer/login')
  @ResponseMessage('Customer logged in successfully')
  async loginCustomer(@Body() dto: LoginDto) {
    return this.authService.loginCustomer(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ResponseMessage('Profile retrieved successfully')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
