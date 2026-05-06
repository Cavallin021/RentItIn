import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import 'dotenv/config';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class FinanceService {
  private spreadsheetId = process.env.SHEET_ID;

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

  async getValorMes(numeroMes: number) {
    function converterParaNumero(valorString: string): number {
      const apenasNumeros = valorString.replace(/[^\d-]/g, '');
      return parseFloat(apenasNumeros) / 100 || 0;
    }
    const sheets = await this.getSheetsInstance();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'A3:Z3',
    });

    const primeiraLinha = response.data.values?.[0];

    const total = primeiraLinha
      ? primeiraLinha.map((item) => converterParaNumero(item))
      : [];

    return { total };
  }

  async getValorMesLC(numeroMes: number) {
    function converterParaNumero(valorString: string): number {
      const apenasNumeros = valorString.replace(/[^\d-]/g, '');
      return parseFloat(apenasNumeros) / 100;
    }
    const sheets = await this.getSheetsInstance();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'A2:Z2',
    });

    const primeiraLinha = response.data.values?.[0];

    const total = primeiraLinha
      ? primeiraLinha.map((item) => converterParaNumero(item))
      : [];

    return { total };
  }

  async adicionarItem(dto: CreateTransactionDto) {
    const sheets = await this.getSheetsInstance();
    const getLetra = (num: number) => {
      let letra = '',
        n = num;
      while (n > 0) {
        n--;
        letra = String.fromCharCode(65 + (n % 26)) + letra;
        n = Math.floor(n / 26);
      }
      return letra;
    };

    const aba = dto.categoria.trim();
    const numParcelas = dto.parcelas && dto.parcelas > 0 ? dto.parcelas : 1;

    // Coluna de Valores do grupo (ex: 2, 4, 6...)
    const colValor = dto.grupoColuna * 2;
    const letraColValor = getLetra(colValor);

    // 1. Lemos APENAS a coluna de valores para achar a última linha
    const rangeBusca = `'${aba}'!${letraColValor}1:${letraColValor}1000`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: rangeBusca,
    });

    // 2. A primeira linha livre será o tamanho do array + 1
    const rows = response.data.values ? response.data.values.length : 0;
    const linhaAlvo = rows + 1;

    // 3. Cálculo da coluna de Nomes (coluna vizinha à esquerda do valor)
    const colName = colValor - 1;

    // 4. Preenchimento horizontal na linha alvo
    let colAtual = colName;

    for (let i = 0; i < numParcelas; i++) {
      const nomeParcelado =
        numParcelas > 1 ? `${dto.name} (${i + 1}/${numParcelas})` : dto.name;
      const valorParcelado = dto.valor;

      // Atualiza Nome (na mesma linha)
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `'${aba}'!${getLetra(colAtual)}${linhaAlvo}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[nomeParcelado || '']] },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `'${aba}'!${getLetra(colAtual + 1)}${linhaAlvo}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[valorParcelado]] },
      });

      colAtual += 2;
    }

    return { success: true };
  }
}
