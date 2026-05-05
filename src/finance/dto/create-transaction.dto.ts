import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  @IsNumber()
  valor!: number;

  @IsNotEmpty()
  @IsString()
  categoria!: string;
}
