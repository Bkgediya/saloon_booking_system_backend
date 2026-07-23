import { IsEnum, IsNotEmpty } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @IsEnum([BookingStatus.COMPLETED, BookingStatus.NO_SHOW], {
    message: 'Status must be either COMPLETED or NO_SHOW',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status!: 'COMPLETED' | 'NO_SHOW';
}
