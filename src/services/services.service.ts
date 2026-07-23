import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { Prisma } from '@prisma/client';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';


@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(ownerId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        ownerId,
        name: dto.name,
        duration: dto.duration,
        price: new Prisma.Decimal(dto.price),
      },
    });
  }

  async findAllForOwner(ownerId: string) {
    return this.prisma.service.findMany({
      where: {
        ownerId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!service || service.isDeleted) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(ownerId: string, id: string, dto: UpdateServiceDto) {
    const service = await this.findOne(id);

    if (service.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You are not authorized to update this service',
      );
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.price !== undefined) updateData.price = new Prisma.Decimal(dto.price);

    return this.prisma.service.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(ownerId: string, id: string) {
    const service = await this.findOne(id);

    if (service.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You are not authorized to delete this service',
      );
    }

    // Perform soft delete
    return this.prisma.service.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async findAllPublic() {
    return this.prisma.service.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAvailableSlots(serviceId: string, dateStr: string) {
    const service = await this.findOne(serviceId);

    // Parse dateStr "YYYY-MM-DD" in UTC
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const days = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const dayOfWeek = days[targetDate.getUTCDay()];

    // Check for specific-date availability overrides first
    const overrides = await this.prisma.availabilityOverride.findMany({
      where: {
        ownerId: service.ownerId,
        date: dateStr,
      },
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
      // Get weekly recurring availability for this day of week
      const weekly = await this.prisma.availability.findMany({
        where: {
          ownerId: service.ownerId,
          dayOfWeek: dayOfWeek as any,
        },
      });
      availabilities = weekly.map((w) => ({
        startTime: w.startTime,
        endTime: w.endTime,
      }));
    }

    // Get active bookings for this owner on this calendar date
    const dayStart = new Date(targetDate);
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const bookings = await this.prisma.booking.findMany({
      where: {
        ownerId: service.ownerId,
        status: { not: 'CANCELLED' },
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
    }> = [];

    const now = new Date();

    for (const availability of availabilities) {
      const [startHours, startMins] = availability.startTime
        .split(':')
        .map(Number);
      const [endHours, endMins] = availability.endTime.split(':').map(Number);

      const startMin = startHours * 60 + startMins;
      const endMin = endHours * 60 + endMins;

      // Generate slots in 30-minute steps starting from availability startTime
      const slotStep = 30;
      let currentMin = startMin;

      while (currentMin < endMin) {
        const slotEndMin = currentMin + service.duration;

        // Boundary Check: If the slot extends past the working hours, skip
        if (slotEndMin > endMin) {
          currentMin += slotStep;
          continue;
        }

        // Construct Date objects
        const slotStart = new Date(targetDate);
        slotStart.setUTCHours(
          Math.floor(currentMin / 60),
          currentMin % 60,
          0,
          0,
        );

        const slotEnd = new Date(targetDate);
        slotEnd.setUTCHours(
          Math.floor(slotEndMin / 60),
          slotEndMin % 60,
          0,
          0,
        );

        // Check if slot start time is in the past
        let isAvailable = true;

        if (slotStart.getTime() <= now.getTime()) {
          isAvailable = false;
        } else {
          // Check overlap with active bookings
          const hasOverlap = bookings.some((booking) => {
            const bStart = new Date(booking.startTime).getTime();
            const bEnd = new Date(booking.endTime).getTime();
            const sStart = slotStart.getTime();
            const sEnd = slotEnd.getTime();
            return bStart < sEnd && bEnd > sStart;
          });

          if (hasOverlap) {
            isAvailable = false;
          }
        }

        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: isAvailable,
        });

        currentMin += slotStep;
      }
    }

    // Sort slots chronologically
    return slots.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }
}

