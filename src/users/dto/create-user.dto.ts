import {
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsAlphanumeric,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsAlphanumeric()
  @Length(3, 20)
  readonly username: string;

  @IsNotEmpty()
  @IsAlphanumeric()
  @Length(8, 20)
  readonly password: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(600)
  @Max(2000)
  readonly rating: number;
}
