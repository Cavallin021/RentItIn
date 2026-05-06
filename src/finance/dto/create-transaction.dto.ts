import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @IsNotEmpty()
  @IsNumber()
  grupoColuna!: number;

  @IsOptional() // O campo não é obrigatório
  @Type(() => Number) // Garante que o input venha como número
  @Min(1) // Impede que o usuário envie 0 ou número negativo
  parcelas: number = 1; // Valor padrão definido aqui
}
