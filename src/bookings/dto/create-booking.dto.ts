import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty({ message: 'Service ID is required' })
  serviceId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  @IsNotEmpty({ message: 'Date is required' })
  date!: string;

  @Matches(/^\d{2}[:.]\d{2}$/, { message: 'Time must be in HH:mm or HH.mm format' })
  @IsNotEmpty({ message: 'Time is required' })
  time!: string;
}
