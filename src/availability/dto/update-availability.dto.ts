import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '@prisma/client';

export class AvailabilityItemDto {
  @IsEnum(DayOfWeek, {
    message:
      'Day of week must be SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, or SATURDAY',
  })
  dayOfWeek!: DayOfWeek;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (e.g., 09:00)',
  })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (e.g., 17:00)',
  })
  endTime!: string;
}

export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityItemDto)
  availabilities!: AvailabilityItemDto[];
}
