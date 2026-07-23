import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) { }

  // Customer endpoints
  @Roles('CUSTOMER')
  @Post()
  @ResponseMessage('Booking created successfully')
  async create(@CurrentUser() customer: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(customer.id, dto);
  }

  @Roles('CUSTOMER')
  @Get('my')
  @ResponseMessage('Bookings retrieved successfully')
  async getMyBookings(@CurrentUser() customer: any) {
    return this.bookingsService.getCustomerBookings(customer.id);
  }

  @Roles('CUSTOMER')
  @Post(':id/cancel')
  @ResponseMessage('Booking cancelled successfully')
  async cancel(@CurrentUser() customer: any, @Param('id') id: string) {
    return this.bookingsService.cancelBooking(customer.id, id);
  }

  // Business Owner endpoints
  @Roles('BUSINESS_OWNER')
  @Get('owner')
  @ResponseMessage('Owner bookings retrieved successfully')
  async getOwnerBookings(@CurrentUser() owner: any) {
    return this.bookingsService.getOwnerBookings(owner.id);
  }

  @Roles('BUSINESS_OWNER')
  @Patch(':id/status')
  @ResponseMessage('Booking status updated successfully')
  async updateStatus(
    @CurrentUser() owner: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(owner.id, id, dto);
  }
}
