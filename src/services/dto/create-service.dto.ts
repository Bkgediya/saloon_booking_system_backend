import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Service name is required' })
  name!: string;

  @IsInt()
  @IsPositive({ message: 'Duration must be a positive integer in minutes' })
  @Min(1)
  duration!: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a valid number with up to 2 decimal places' },
  )
  @IsPositive({ message: 'Price must be greater than zero' })
  price!: number;
}
