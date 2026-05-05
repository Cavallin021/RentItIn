import { Body, Controller, Get, Post } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('total')
  async getTotal() {
    return await this.financeService.getValorMes();
  }

  @Post('adicionar')
  async adicionar(@Body() dto: CreateTransactionDto) {
    return await this.financeService.adicionarItem(dto);
  }
}
