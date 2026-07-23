import { BadRequestException, Injectable } from '@nestjs/common';
import { SetAvailabilityDto, AvailabilityItemDto } from './dto/update-availability.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SetAvailabilityOverrideDto, AvailabilityOverrideSlotDto } from './dto/update-availability-override.dto.js';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) { }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private validateAndGroupAvailabilities(items: AvailabilityItemDto[]): void {
    // Ensure startTime < endTime for each item
    for (const item of items) {
      const start = this.timeToMinutes(item.startTime);
      const end = this.timeToMinutes(item.endTime);
      if (start >= end) {
        throw new BadRequestException(
          `Invalid time window: ${item.startTime} to ${item.endTime} on ${item.dayOfWeek}. Start time must be before end time.`,
        );
      }
    }

    // Group by day of week and check for overlaps
    const grouped = new Map<string, AvailabilityItemDto[]>();
    for (const item of items) {
      const day = item.dayOfWeek;
      if (!grouped.has(day)) {
        grouped.set(day, []);
      }
      grouped.get(day)!.push(item);
    }

    // Verify overlaps in each day group
    for (const [day, dayItems] of grouped.entries()) {
      // Sort by start time
      const sorted = [...dayItems].sort(
        (a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime),
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        const currentEnd = this.timeToMinutes(current.endTime);
        const nextStart = this.timeToMinutes(next.startTime);

        if (currentEnd > nextStart) {
          throw new BadRequestException(
            `Overlapping availability windows detected for ${day}: [${current.startTime} - ${current.endTime}] and [${next.startTime} - ${next.endTime}]`,
          );
        }
      }
    }
  }

  async setAvailability(ownerId: string, dto: SetAvailabilityDto) {
    this.validateAndGroupAvailabilities(dto.availabilities);

    const existing = await this.prisma.availability.findMany({
      where: { ownerId },
    });

    for (const item of dto.availabilities) {
      const start = this.timeToMinutes(item.startTime);
      const end = this.timeToMinutes(item.endTime);

      for (const exist of existing) {
        if (exist.dayOfWeek === item.dayOfWeek) {
          const existStart = this.timeToMinutes(exist.startTime);
          const existEnd = this.timeToMinutes(exist.endTime);

          if (existStart === start && existEnd === end) {
            throw new BadRequestException(
              `Availability slot for ${item.dayOfWeek} ${item.startTime} - ${item.endTime} already exists.`,
            );
          }

          if (start < existEnd && existStart < end) {
            throw new BadRequestException(
              `Overlapping availability window detected for ${item.dayOfWeek} with existing slot [${exist.startTime} - ${exist.endTime}].`,
            );
          }
        }
      }
    }

    if (dto.availabilities.length === 0) {
      return [];
    }

    return this.prisma.availability.createManyAndReturn({
      data: dto.availabilities.map((item) => ({
        ownerId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
    });
  }

  async getAvailabilityForOwner(ownerId: string) {
    return this.prisma.availability.findMany({
      where: { ownerId },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  private validateAndGroupOverrideSlots(date: string, items: AvailabilityOverrideSlotDto[]): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('At least one timeslot slot is required when isUnavailable is false.');
    }

    // Ensure startTime < endTime for each item
    for (const item of items) {
      const start = this.timeToMinutes(item.startTime);
      const end = this.timeToMinutes(item.endTime);
      if (start >= end) {
        throw new BadRequestException(
          `Invalid time window: ${item.startTime} to ${item.endTime} on ${date}. Start time must be before end time.`,
        );
      }
    }

    // Sort by start time
    const sorted = [...items].sort(
      (a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime),
    );

    // Verify overlaps
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const currentEnd = this.timeToMinutes(current.endTime);
      const nextStart = this.timeToMinutes(next.startTime);

      if (currentEnd > nextStart) {
        throw new BadRequestException(
          `Overlapping availability override windows detected for ${date}: [${current.startTime} - ${current.endTime}] and [${next.startTime} - ${next.endTime}]`,
        );
      }
    }
  }

  async setAvailabilityOverride(ownerId: string, dto: SetAvailabilityOverrideDto) {
    // Wrap in a transaction to safely update overrides for a single date
    return this.prisma.$transaction(async (tx) => {
      // Clear existing overrides for this specific date
      await tx.availabilityOverride.deleteMany({
        where: { ownerId, date: dto.date },
      });

      // If completely closed/unavailable on this date
      if (dto.isUnavailable) {
        return [
          await tx.availabilityOverride.create({
            data: {
              ownerId,
              date: dto.date,
              isUnavailable: true,
            },
          }),
        ];
      }

      // Otherwise validate and insert custom slots
      const slots = dto.slots || [];
      this.validateAndGroupOverrideSlots(dto.date, slots);

      return tx.availabilityOverride.createManyAndReturn({
        data: slots.map((slot) => ({
          ownerId,
          date: dto.date,
          isUnavailable: false,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    });
  }

  async getAvailabilityOverrides(ownerId: string) {
    return this.prisma.availabilityOverride.findMany({
      where: { ownerId },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }
}
