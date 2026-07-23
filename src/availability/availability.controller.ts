import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { SetAvailabilityDto } from './dto/update-availability.dto.js';
import { SetAvailabilityOverrideDto } from './dto/update-availability-override.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUSINESS_OWNER')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) { }

  @Post()
  @ResponseMessage('Availability timeslots set successfully')
  async setAvailability(
    @CurrentUser() owner: any,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.availabilityService.setAvailability(owner.id, dto);
  }

  @Get('my')
  @ResponseMessage('Availability retrieved successfully')
  async getMyAvailability(@CurrentUser() owner: any) {
    return this.availabilityService.getAvailabilityForOwner(owner.id);
  }

  @Post('overrides')
  @ResponseMessage('Availability override set successfully')
  async setAvailabilityOverride(
    @CurrentUser() owner: any,
    @Body() dto: SetAvailabilityOverrideDto,
  ) {
    return this.availabilityService.setAvailabilityOverride(owner.id, dto);
  }

  @Get('overrides')
  @ResponseMessage('Availability overrides retrieved successfully')
  async getMyAvailabilityOverrides(@CurrentUser() owner: any) {
    return this.availabilityService.getAvailabilityOverrides(owner.id);
  }
}
