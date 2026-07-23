import {
  IsInt,
  IsOptional,
  IsNumber,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsPositive({ message: 'Duration must be a positive integer in minutes' })
  @Min(1)
  @IsOptional()
  duration?: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a valid number with up to 2 decimal places' },
  )
  @IsPositive({ message: 'Price must be greater than zero' })
  @IsOptional()
  price?: number;
}
