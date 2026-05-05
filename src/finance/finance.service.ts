import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import 'dotenv/config';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class FinanceService {
  private spreadsheetId = '1P8oAcZ_32lVis3eMbURHv2syiuOe3K4iklBwbD1bSaU';

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

  async getValorMes() {
    function converterParaNumero(valorString: string): number {
      const apenasNumeros = valorString.replace(/[^\d-]/g, '');
      return parseFloat(apenasNumeros) / 100;
    }

    const dataAtual: Date = new Date();
    // getMonth() retorna 0-11, somamos 1 para ter 1-12
    const numeroMes: number = dataAtual.getMonth() + 1;
    const sheets = await this.getSheetsInstance();

    // Supondo que seu range cubra pelo menos até a coluna do mês desejado
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'A2:Z2',
    });

    const row = response.data.values ? response.data.values[0] : [];

    const total = converterParaNumero(row[numeroMes - 1]);

    return { total };
  }

  async adicionarItem(dto: CreateTransactionDto) {
    const sheets = await this.getSheetsInstance();

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[dto.name, dto.valor, dto.categoria]],
      },
    });

    return { success: true };
  }
}
