import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import 'dotenv/config';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class FinanceService {
  private spreadsheetId = process.env.SHEET_ID;

  // Uma aba por mês. As colunas de cada aba são: Nome | Parcela | Valor | Data | Tipo
  private readonly MONTH_NAMES: { [key: number]: string } = {
    1: 'Janeiro',
    2: 'Fevereiro',
    3: 'Março',
    4: 'Abril',
    5: 'Maio',
    6: 'Junho',
    7: 'Julho',
    8: 'Agosto',
    9: 'Setembro',
    10: 'Outubro',
    11: 'Novembro',
    12: 'Dezembro',
  };

  // O app usa "Lenicard", mas na planilha o tipo do cartão de crédito é "Crédito".
  private tipoPlanilha(categoria: string): string {
    const c = categoria.trim();
    return c.toLowerCase() === 'lenicard' ? 'Crédito' : c;
  }

  private async getSheetsInstance() {
    const jsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!jsonString) {
      throw new Error(
        'GOOGLE_APPLICATION_CREDENTIALS_JSON is not defined in environment variables.',
      );
    }

    const credentials = JSON.parse(jsonString);

    const auth = new google.auth.GoogleAuth({
      credentials, // Passa o objeto JSON diretamente
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = (await auth.getClient()) as any;

    return google.sheets({ version: 'v4', auth: authClient });
  }

  // Converte "R$ 1.234,56", "-R$ 1.234,56", "1234.56" ou número para number.
  private parseValor(val: unknown): number {
    if (typeof val === 'number') return val;
    let clean = String(val ?? '')
      .replace(/R\$\s?/g, '')
      .trim();
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      const dotCount = (clean.match(/\./g) || []).length;
      if (dotCount > 1) {
        clean = clean.replace(/\./g, '');
      }
    }
    return parseFloat(clean) || 0;
  }

  // Lê uma linha da aba "Casa" (B = Janeiro ... M = Dezembro) e devolve
  // um array de 13 posições, onde o índice é o número do mês (0 não é usado).
  private async lerLinhaCasa(indiceLinha: number): Promise<{ total: number[] }> {
    const sheets = await this.getSheetsInstance();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Casa!A1:N5',
    });

    const linha = response.data.values?.[indiceLinha] || [];
    const total = new Array(13).fill(0);
    for (let mes = 1; mes <= 12; mes++) {
      total[mes] = this.parseValor(linha[mes]);
    }
    return { total };
  }

  // Linha 3 da aba Casa: saldo / total geral
  async getValorMes(numeroMes: number) {
    return this.lerLinhaCasa(2);
  }

  // Linha 2 da aba Casa: fatura do cartão (Lenicard)
  async getValorMesLC(numeroMes: number) {
    return this.lerLinhaCasa(1);
  }

  async adicionarItem(dto: CreateTransactionDto) {
    const sheets = await this.getSheetsInstance();

    const numParcelas = dto.parcelas && dto.parcelas > 0 ? dto.parcelas : 1;
    const mesInicial = dto.grupoColuna;
    const tipo = this.tipoPlanilha(dto.categoria);
    const dataRegistro = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });

    // Valor como número puro (evita problemas de interpretação de vírgula/ponto)
    const valorParcela = this.parseValor(dto.valor);

    for (let i = 0; i < numParcelas; i++) {
      let mesAlvo = mesInicial + i;
      while (mesAlvo > 12) mesAlvo -= 12;

      const aba = this.MONTH_NAMES[mesAlvo];
      if (!aba) continue;

      const nomeParcelado =
        numParcelas > 1 ? `${dto.name} (${i + 1}/${numParcelas})` : dto.name;
      const parcelaStr = `${i + 1}/${numParcelas}`;

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `'${aba}'!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[nomeParcelado, parcelaStr, valorParcela, dataRegistro, tipo]],
        },
      });
    }

    return { success: true };
  }

  async getRecentes(numeroMes: number, categoria: string) {
    const aba = this.MONTH_NAMES[numeroMes];
    if (!aba) return [];

    const tipoAlvo = this.tipoPlanilha(categoria).toLowerCase();

    try {
      const sheets = await this.getSheetsInstance();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `'${aba}'!A2:E1000`,
      });

      const rows = response.data.values || [];
      const transacoes = rows
        .filter((row) => {
          const nome = row[0];
          const valorRaw = row[2];
          const tipo = String(row[4] ?? '').trim().toLowerCase();
          return nome && valorRaw && tipo === tipoAlvo;
        })
        .map((row) => ({
          name: row[0] as string,
          valor: this.parseValor(row[2]),
          parcela: (row[1] as string) ?? '',
          data: (row[3] as string) ?? '',
        }));

      return transacoes.slice(-5).reverse();
    } catch (error) {
      return [];
    }
  }
}
