import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) { }

  // Public endpoint: browse all services
  @Get()
  @ResponseMessage('Services retrieved successfully')
  async findAllPublic() {
    return this.servicesService.findAllPublic();
  }

  // Protected Business Owner endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS_OWNER')
  @Post()
  @ResponseMessage('Service created successfully')
  async create(@CurrentUser() owner: any, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(owner.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS_OWNER')
  @Get('my')
  @ResponseMessage('Owner services retrieved successfully')
  async findMy(@CurrentUser() owner: any) {
    return this.servicesService.findAllForOwner(owner.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS_OWNER')
  @Put(':id')
  @ResponseMessage('Service updated successfully')
  async update(
    @CurrentUser() owner: any,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(owner.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS_OWNER')
  @Delete(':id')
  @ResponseMessage('Service deleted successfully')
  async remove(@CurrentUser() owner: any, @Param('id') id: string) {
    return this.servicesService.remove(owner.id, id);
  }

  @Get(':id')
  @ResponseMessage('Service details retrieved successfully')
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Get(':id/slots')
  @ResponseMessage('Available slots retrieved successfully')
  async getSlots(
    @Param('id') id: string,
    @Query() query: GetSlotsQueryDto,
  ) {
    return this.servicesService.getAvailableSlots(id, query.date);
  }
}
