import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetSlotsQueryDto {
  @IsNotEmpty({ message: 'Date is required' })
  @IsDateString(
    {},
    { message: 'Date must be a valid ISO 8601 date string (e.g., YYYY-MM-DD)' },
  )
  date!: string;
}
