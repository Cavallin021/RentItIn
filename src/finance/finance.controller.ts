import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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

  @Get('recentes')
  async getRecentes(
    @Query('mes') mes: string,
    @Query('categoria') categoria: string,
  ) {
    const numeroMes = parseInt(mes, 10);
    return await this.financeService.getRecentes(numeroMes, categoria);
  }
}
