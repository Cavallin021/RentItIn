import { Body, Controller, Get, Post, Query, Delete } from '@nestjs/common';
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
    return await this.financeService.adicionarItem(dto);
  }

  @Get('meses-disponiveis')
  async getMesesDisponiveis() {
    return await this.financeService.getMesesDisponiveis();
  }

  @Get('recentes')
  async getRecentes() {
    return await this.financeService.getRecentes();
  }

  @Get('mes')
  async getLancamentosMes(@Query('mes') mes: string) {
    const numeroMes = parseInt(mes, 10);
    return await this.financeService.getLancamentosMes(numeroMes);
  }

  @Post('limpar')
  async limparCasa(
    @Body('senha') senha: string,
    @Body('mes') mes: number,
  ) {
    return await this.financeService.limparColunaCasa(senha, mes);
  }

  @Delete('remover')
  async removerItem(
    @Body('mes') mes: number,
    @Body('rowIndex') rowIndex: number,
    @Body('nome') nome: string,
    @Body('parcela') parcela: string,
  ) {
    return await this.financeService.removerItem(mes, rowIndex, nome, parcela);
  }
}
