import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) { }

  private timeToMinutes(hours: number, minutes: number): number {
    return hours * 60 + minutes;
  }

  async createBooking(customerId: string, dto: CreateBookingDto) {
    const [year, month, day] = dto.date.split('-').map(Number);
    const normalizedTime = dto.time.replace('.', ':');
    const [hours, minutes] = normalizedTime.split(':').map(Number);

    const startTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

    if (startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot book a slot in the past');
    }

    // Interactive transaction with row locking
    return this.prisma.$transaction(async (tx) => {
      // Fetch service to identify the owner
      const service = await tx.service.findUnique({
        where: { id: dto.serviceId },
      });

      if (!service || service.isDeleted) {
        throw new NotFoundException('Service not found or has been deleted');
      }

      // Lock the business owner row to serialize booking checks for this owner
      await tx.$executeRaw`SELECT 1 FROM business_owners WHERE id = ${service.ownerId} FOR UPDATE`;

      // Compute booking endTime based on service duration
      const endTime = new Date(startTime.getTime() + service.duration * 60000);

      // Validate booking lies within availability overrides or weekly availability
      const dateStr = dto.date;
      const days = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ];
      const dayOfWeek = days[startTime.getUTCDay()];

      const overrides = await tx.availabilityOverride.findMany({
        where: { ownerId: service.ownerId, date: dateStr },
      });

      let availabilities: Array<{ startTime: string; endTime: string }> = [];

      if (overrides.length > 0) {
        const isClosed = overrides.some((o) => o.isUnavailable);
        if (!isClosed) {
          availabilities = overrides
            .filter((o) => o.startTime && o.endTime)
            .map((o) => ({
              startTime: o.startTime!,
              endTime: o.endTime!,
            }));
        }
      } else {
        const weekly = await tx.availability.findMany({
          where: { ownerId: service.ownerId, dayOfWeek: dayOfWeek as any },
        });
        availabilities = weekly.map((w) => ({
          startTime: w.startTime,
          endTime: w.endTime,
        }));
      }

      const bookingStartMin = this.timeToMinutes(
        startTime.getUTCHours(),
        startTime.getUTCMinutes(),
      );
      const bookingEndMin = this.timeToMinutes(
        endTime.getUTCHours(),
        endTime.getUTCMinutes(),
      );

      // Find a matching availability window
      const avWindow = availabilities.find((av) => {
        const [avStartH, avStartM] = av.startTime.split(':').map(Number);
        const [avEndH, avEndM] = av.endTime.split(':').map(Number);
        const avStartMin = this.timeToMinutes(avStartH, avStartM);
        const avEndMin = this.timeToMinutes(avEndH, avEndM);

        return bookingStartMin >= avStartMin && bookingEndMin <= avEndMin;
      });

      if (!avWindow) {
        throw new BadRequestException(
          'Booking time is outside the business owner availability hours',
        );
      }

      // Verify the slot aligns with 30-minute intervals from the window's start time
      const [windowStartH, windowStartM] = avWindow.startTime
        .split(':')
        .map(Number);
      const windowStartMin = this.timeToMinutes(windowStartH, windowStartM);

      if ((bookingStartMin - windowStartMin) % 30 !== 0) {
        throw new BadRequestException(
          'Booking start time must align with the 30-minute slot intervals',
        );
      }

      // Check for conflicting overlapping bookings
      const overlap = await tx.booking.findFirst({
        where: {
          ownerId: service.ownerId,
          status: { not: 'CANCELLED' },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (overlap) {
        throw new ConflictException(
          'The requested time slot is already booked for this provider',
        );
      }

      // Insert the booking
      return tx.booking.create({
        data: {
          customerId,
          ownerId: service.ownerId,
          serviceId: service.id,
          startTime,
          endTime,
          status: 'CONFIRMED',
        },
        include: {
          service: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  }

  async getCustomerBookings(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      include: {
        service: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async getOwnerBookings(ownerId: string) {
    return this.prisma.booking.findMany({
      where: { ownerId },
      include: {
        service: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async cancelBooking(customerId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock the booking row for update
      const booking = await tx.$queryRaw<any[]>`
        SELECT * FROM bookings WHERE id = ${id} FOR UPDATE
      `;

      if (booking.length === 0) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      const activeBooking = booking[0];

      if (activeBooking.customerId !== customerId) {
        throw new ForbiddenException(
          'You are not authorized to cancel this booking',
        );
      }

      if (activeBooking.status !== 'CONFIRMED') {
        throw new BadRequestException(
          `Cannot cancel a booking that is already ${activeBooking.status.toLowerCase()}`,
        );
      }

      return tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async updateBookingStatus(
    ownerId: string,
    id: string,
    dto: UpdateBookingStatusDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Lock the booking row for update
      const booking = await tx.$queryRaw<any[]>`
        SELECT * FROM bookings WHERE id = ${id} FOR UPDATE
      `;

      if (booking.length === 0) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      const activeBooking = booking[0];

      if (activeBooking.ownerId !== ownerId) {
        throw new ForbiddenException(
          'You are not authorized to manage this booking',
        );
      }

      if (activeBooking.status !== 'CONFIRMED') {
        throw new BadRequestException(
          `Cannot update status of a booking that is ${activeBooking.status.toLowerCase()}`,
        );
      }

      return tx.booking.update({
        where: { id },
        data: { status: dto.status },
      });
    });
  }
}
