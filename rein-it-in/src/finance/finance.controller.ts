import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('total')
  async getTotal(@Query('mes') mes: string) {
    const numeroMes = parseInt(mes, 10);
    return await this.financeService.getValorMes(numeroMes);
  }

  @Get('total/LC')
  async getTotalLC(@Query('mes') mes: string) {
    const numeroMes = parseInt(mes, 10);
    return await this.financeService.getValorMesLC(numeroMes);
  }

  @Post('adicionar')
  async adicionar(@Body() dto: CreateTransactionDto) {
    try {
      return await this.financeService.adicionarItem(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erro ao adicionar lançamento:', message, dto);
      throw new InternalServerErrorException(message);
    }
  }

  @Post('editar')
  async editar(
    @Body('mes') mes: number,
    @Body('novoMes') novoMes: number,
    @Body('rowIndex') rowIndex: number,
    @Body('nomeOriginal') nomeOriginal: string,
    @Body('name') name: string,
    @Body('valor') valor: number,
    @Body('categoria') categoria: string,
    @Body('atualizarFuturas') atualizarFuturas?: boolean,
  ) {
    try {
      return await this.financeService.editarItem({
        mes: Number(mes),
        novoMes: Number(novoMes ?? mes),
        rowIndex: Number(rowIndex),
        nomeOriginal,
        name,
        valor,
        categoria,
        atualizarFuturas: atualizarFuturas !== false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erro ao editar lançamento:', message);
      throw new InternalServerErrorException(message);
    }
  }

  @Post('remover')
  async remover(
    @Body('mes') mes: number,
    @Body('rowIndex') rowIndex: number,
    @Body('nome') nome: string,
    @Body('todasParcelas') todasParcelas?: boolean,
  ) {
    try {
      return await this.financeService.removerItem(
        Number(mes),
        Number(rowIndex),
        nome,
        Boolean(todasParcelas),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erro ao remover lançamento:', message);
      throw new InternalServerErrorException(message);
    }
  }

  @Get('meses-disponiveis')
  getMesesDisponiveis() {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  @Get('recentes')
  async getRecentes(
    @Query('mes') mes?: string,
    @Query('categoria') categoria?: string,
  ) {
    if (!mes || !categoria) {
      return [];
    }
    const numeroMes = parseInt(mes, 10);
    return await this.financeService.getRecentes(numeroMes, categoria);
  }
}
