import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import 'dotenv/config';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class FinanceService implements OnModuleInit {
  private spreadsheetId = process.env.SHEET_ID;
  private sheetsClient: sheets_v4.Sheets;

  private readonly MONTH_NAMES: { [key: number]: string } = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
  };

  async onModuleInit() {
    this.sheetsClient = await this.createSheetsInstance();
  }

  private async createSheetsInstance(): Promise<sheets_v4.Sheets> {
    const jsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!jsonString) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not defined.');
    }
    const credentials = JSON.parse(jsonString);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = (await auth.getClient()) as any;
    return google.sheets({ version: 'v4', auth: authClient });
  }

  private converterParaNumero(valorString: string): number {
    const apenasNumeros = valorString.replace(/[^\d-]/g, '');
    return parseFloat(apenasNumeros) / 100 || 0;
  }

  async getValorMes(numeroMes: number) {
    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'CASA!A1:N5',
      });
      const rows = response.data.values || [];
      // A linha 3 na planilha corresponde ao índice 2 do array
      const row3 = rows[2] || [];
      // Janeiro (numeroMes=1) = Coluna B (índice 1). Bate certinho!
      const valorStr = row3[numeroMes] || '0';
      const sum = this.converterParaNumero(valorStr);

      const result = new Array(13).fill(0);
      result[numeroMes] = sum;
      return { total: result };
    } catch (e) {
      return { total: [] };
    }
  }

  async getValorMesLC(numeroMes: number) {
    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'CASA!A1:N5',
      });
      const rows = response.data.values || [];
      // A linha 2 na planilha corresponde ao índice 1 do array
      const row2 = rows[1] || [];
      // Janeiro (numeroMes=1) = Coluna B (índice 1)
      const valorStr = row2[numeroMes] || '0';
      const sum = this.converterParaNumero(valorStr);

      const result = new Array(13).fill(0);
      result[numeroMes] = sum;
      return { total: result };
    } catch (e) {
      return { total: [] };
    }
  }

  async getMesesDisponiveis() {
    try {
      const spreadsheet = await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheets = spreadsheet.data.sheets || [];
      const meses: number[] = [];
      for (const s of sheets) {
        const title = s.properties?.title || '';
        for (const [num, name] of Object.entries(this.MONTH_NAMES)) {
          if (title.toUpperCase() === name.toUpperCase()) {
            meses.push(parseInt(num, 10));
          }
        }
      }
      meses.sort((a, b) => a - b);
      return meses.length > 0 ? meses : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    } catch (e) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  }

  async adicionarItem(dto: CreateTransactionDto) {
    const numParcelas = dto.parcelas && dto.parcelas > 0 ? dto.parcelas : 1;
    const mesInicial = dto.grupoColuna;
    const dataRegistro = new Date().toLocaleString('pt-BR');

    for (let i = 0; i < numParcelas; i++) {
      let targetMes = mesInicial + i;
      while (targetMes > 12) targetMes -= 12;

      const tabName = this.MONTH_NAMES[targetMes];
      if (!tabName) continue;

      const nomeParcelado = numParcelas > 1 ? `${dto.name} (${i + 1}/${numParcelas})` : dto.name;
      const parcelaStr = numParcelas > 1 ? `${i + 1}/${numParcelas}` : `1/1`;
      let valorFormatado = dto.valor.toFixed(2).replace('.', ',');

      const rowValues = [nomeParcelado, parcelaStr, `R$ ${valorFormatado}`, dataRegistro, dto.categoria];

      await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `'${tabName}'!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    }
    return { success: true };
  }

  async getRecentes() {
    try {
      const ranges = Object.values(this.MONTH_NAMES).map(name => `'${name}'!A2:E1000`);
      const response = await this.sheetsClient.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: ranges,
      });

      let todasTransacoes: any[] = [];
      const valueRanges = response.data.valueRanges || [];

      for (const vr of valueRanges) {
        const rows = vr.values || [];
        for (const row of rows) {
          const name = row[0];
          const valorRaw = row[2];
          const dataStr = row[3];
          const reg = row[4];
          if (!name || !valorRaw || !dataStr) continue;

          // Parse dataStr "DD/MM/YYYY" or similar to Date object for sorting
          let dateObj = new Date(0);
          if (dataStr.includes('/')) {
            const parts = dataStr.split('/');
            if (parts.length >= 3) {
              // DD/MM/YYYY
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              let year = parseInt(parts[2], 10);
              if (year < 100) year += 2000;
              dateObj = new Date(year, month, day);
            }
          }

          let clean = valorRaw.replace(/R\$\s?/g, '').trim();
          if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
          else {
            const dotCount = (clean.match(/\./g) || []).length;
            if (dotCount > 1) clean = clean.replace(/\./g, '');
          }
          const valor = parseFloat(clean) || 0;

          todasTransacoes.push({ name, valor, data: dataStr, categoria: reg, dateObj });
        }
      }

      // Sort globally by date descending
      todasTransacoes.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

      // Return the top 5
      return todasTransacoes.slice(0, 5).map(t => ({
        name: t.name,
        valor: t.valor,
        data: t.data,
        categoria: t.categoria
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getLancamentosMes(numeroMes: number) {
    const tabName = this.MONTH_NAMES[numeroMes];
    if (!tabName) return [];
    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `'${tabName}'!A2:E1000`,
      });
      const rows = response.data.values || [];
      const transacoes = rows
        .map((row, idx) => {
          const name = row[0];
          const parcela = row[1];
          const valorRaw = row[2];
          const data = row[3];
          const reg = row[4];
          if (!name || !valorRaw) return null;
          
          let clean = valorRaw.replace(/R\$\s?/g, '').trim();
          if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
          else {
            const dotCount = (clean.match(/\./g) || []).length;
            if (dotCount > 1) clean = clean.replace(/\./g, '');
          }
          const valor = parseFloat(clean) || 0;
          return { name, parcela, valor, data, categoria: reg, rowIndex: idx + 1 };
        })
        .filter((item) => item !== null);
      return transacoes.reverse();
    } catch (error) {
      return [];
    }
  }

  private async getSheetId(tabName: string): Promise<number | null> {
    try {
      const spreadsheet = await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheets = spreadsheet.data.sheets || [];
      const sheet = sheets.find(s => s.properties?.title?.toUpperCase() === tabName.toUpperCase());
      return sheet ? (sheet.properties?.sheetId || 0) : null;
    } catch (e) {
      return null;
    }
  }

  async removerItem(mes: number, rowIndex: number, nome: string, parcela: string) {
    const sheetId = await this.getSheetId(this.MONTH_NAMES[mes]);
    if (sheetId === null) return { success: false };

    // 1. Apagar a linha atual
    await this.sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              }
            }
          }
        ]
      }
    });

    // 2. Se for parcelado, apagar as subsequentes
    if (parcela && parcela.includes('/')) {
      const parts = parcela.split('/');
      const current = parseInt(parts[0], 10);
      const total = parseInt(parts[1], 10);
      
      const originalName = nome.replace(` (${parcela})`, '').trim();

      for (let k = current + 1; k <= total; k++) {
        let targetMes = mes + (k - current);
        while (targetMes > 12) targetMes -= 12;

        const targetTabName = this.MONTH_NAMES[targetMes];
        const targetSheetId = await this.getSheetId(targetTabName);
        if (targetSheetId === null) continue;

        const response = await this.sheetsClient.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'${targetTabName}'!A2:E1000`,
        });
        const rows = response.data.values || [];
        
        const targetName = `${originalName} (${k}/${total})`;
        const targetIndex = rows.findIndex(row => row[0] === targetName);

        if (targetIndex !== -1) {
          const deleteIndex = targetIndex + 1; // 0-based, A2 is 1
          await this.sheetsClient.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: targetSheetId,
                      dimension: 'ROWS',
                      startIndex: deleteIndex,
                      endIndex: deleteIndex + 1,
                    }
                  }
                }
              ]
            }
          });
        }
      }
    }

    return { success: true };
  }

  async limparColunaCasa(senhaFornecida: string, mes: number) {
    // 1. Ler a senha da aba 'config' (célula B1)
    const configResponse = await this.sheetsClient.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'config!B1',
    });
    const senhaCorreta = configResponse.data.values?.[0]?.[0];

    if (!senhaCorreta) {
      throw new UnauthorizedException('Senha não configurada na planilha');
    }

    if (senhaFornecida !== senhaCorreta.toString().trim()) {
      throw new UnauthorizedException('Senha incorreta');
    }

    const tabName = this.MONTH_NAMES[mes];
    if (!tabName) throw new Error('Mês inválido');

    // 2. Fetch all rows in the month tab
    const response = await this.sheetsClient.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `'${tabName}'!A2:E`,
    });

    const rows = response.data.values || [];

    // Determine the Target Year of the tab being cleared
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    let targetYear = currentYear;
    if (mes < currentMonth) {
      targetYear = currentYear + 1;
    }

    const rowsToKeep: any[][] = [];

    for (const row of rows) {
      const dataStr = row[3]; // e.g. "02/09/2026 16:50:20"
      const parcelaStr = row[1]; // e.g. "13/24"

      // If missing data or parcela, we just delete it (it's malformed or old)
      if (!dataStr || !parcelaStr) continue;

      // Extract year from Date string (assuming DD/MM/YYYY or similar)
      const dateParts = dataStr.split(' ')[0].split('/');
      let purchaseYear = currentYear; // fallback
      if (dateParts.length >= 3) {
        purchaseYear = parseInt(dateParts[2], 10);
      }

      // Parse Parcela "N/Total"
      const match = parcelaStr.match(/^(\d+)\/(\d+)$/);
      if (!match) {
        // If it's not a standard installment format, keep it if it's from the target year?
        // Usually means user typed something manually. We'll delete it to be safe,
        // or we could keep it if purchaseYear >= targetYear.
        if (purchaseYear >= targetYear) rowsToKeep.push(row);
        continue;
      }

      const N = parseInt(match[1], 10);

      // Math magic: calculate when it was bought to find out what year THIS installment is due
      // mesInicial = (((mes - 1 - (N - 1)) % 12) + 12) % 12 + 1
      const mesInicial = (((mes - 1 - (N - 1)) % 12) + 12) % 12 + 1;

      // DueYear = PurchaseYear + floor((mesInicial - 1 + N - 1) / 12)
      const dueYear = purchaseYear + Math.floor((mesInicial - 1 + N - 1) / 12);

      // Keep if the installment is due in the target year or later
      if (dueYear >= targetYear) {
        rowsToKeep.push(row);
      }
    }

    // 3. Clear the tab completely
    await this.sheetsClient.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `'${tabName}'!A2:E`,
    });

    // 4. Write back the preserved rows
    if (rowsToKeep.length > 0) {
      await this.sheetsClient.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `'${tabName}'!A2:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rowsToKeep },
      });
    }

    return { success: true, message: 'Aba limpa com sucesso!' };
  }
}
