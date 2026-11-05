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

  private async getSheetId(
    sheets: Awaited<ReturnType<FinanceService['getSheetsInstance']>>,
    aba: string,
  ): Promise<number | null> {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: 'sheets.properties(sheetId,title)',
    });
    const sheet = (meta.data.sheets || []).find(
      (s) => s.properties?.title === aba,
    );
    return sheet?.properties?.sheetId ?? null;
  }

  private async excluirLinha(
    sheets: Awaited<ReturnType<FinanceService['getSheetsInstance']>>,
    sheetId: number,
    rowIndex: number,
  ) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-based
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });
  }

  // Exclui a linha `rowIndex` da aba do mês. Só exclui se o nome da linha
  // ainda for o mesmo (protege contra a planilha ter mudado desde a listagem).
  // Com `todasParcelas`, também exclui as outras parcelas nos outros meses.
  async removerItem(
    mes: number,
    rowIndex: number,
    nome: string,
    todasParcelas = false,
  ) {
    const aba = this.MONTH_NAMES[mes];
    if (!aba) throw new Error('Mês inválido');
    if (!rowIndex || rowIndex < 2) throw new Error('Linha inválida');

    const sheets = await this.getSheetsInstance();

    const atual = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `'${aba}'!A${rowIndex}:E${rowIndex}`,
    });
    const nomeNaLinha = atual.data.values?.[0]?.[0];
    if (nomeNaLinha !== nome) {
      throw new Error(
        'A planilha mudou desde a última atualização. Atualize e tente novamente.',
      );
    }

    // Outras parcelas ("Nome (k/N)") em outros meses
    const match = nome.match(/^(.*) \((\d+)\/(\d+)\)$/);
    if (todasParcelas && match) {
      const original = match[1];
      const atualParcela = parseInt(match[2], 10);
      const total = parseInt(match[3], 10);

      for (let k = 1; k <= total; k++) {
        if (k === atualParcela) continue;

        let mesAlvo = mes + (k - atualParcela);
        while (mesAlvo > 12) mesAlvo -= 12;
        while (mesAlvo < 1) mesAlvo += 12;

        const abaAlvo = this.MONTH_NAMES[mesAlvo];
        const sheetIdAlvo = await this.getSheetId(sheets, abaAlvo);
        if (sheetIdAlvo === null) continue;

        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `'${abaAlvo}'!A2:A1000`,
        });
        const nomes = resp.data.values || [];
        const alvo = `${original} (${k}/${total})`;
        const idx = nomes.findIndex((r) => r[0] === alvo);
        if (idx !== -1) {
          await this.excluirLinha(sheets, sheetIdAlvo, idx + 2);
        }
      }
    }

    const sheetId = await this.getSheetId(sheets, aba);
    if (sheetId === null) throw new Error(`Aba "${aba}" não encontrada`);
    await this.excluirLinha(sheets, sheetId, rowIndex);

    return { success: true };
  }

  // Edita nome, valor e tipo de um lançamento. Se o mês mudar, a linha é
  // movida para a aba do novo mês. Se for parcelado e atualizarFuturas for true,
  // atualiza também as parcelas dos meses futuros com o novo valor/nome/categoria.
  async editarItem(params: {
    mes: number;
    novoMes: number;
    rowIndex: number;
    nomeOriginal: string;
    name: string;
    valor: number;
    categoria: string;
    atualizarFuturas?: boolean;
  }) {
    const {
      mes,
      novoMes,
      rowIndex,
      nomeOriginal,
      name,
      valor,
      categoria,
      atualizarFuturas = true,
    } = params;
    const aba = this.MONTH_NAMES[mes];
    const abaNova = this.MONTH_NAMES[novoMes];
    if (!aba || !abaNova) throw new Error('Mês inválido');
    if (!rowIndex || rowIndex < 2) throw new Error('Linha inválida');
    if (!name || !name.trim()) throw new Error('Nome é obrigatório');

    const sheets = await this.getSheetsInstance();

    const atual = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `'${aba}'!A${rowIndex}:E${rowIndex}`,
    });
    const linha = atual.data.values?.[0] || [];
    if (linha[0] !== nomeOriginal) {
      throw new Error(
        'A planilha mudou desde a última atualização. Atualize e tente novamente.',
      );
    }

    const colunaParcela = String(linha[1] ?? '').trim();
    const matchColParcela = colunaParcela.match(/^(\d+)\/(\d+)$/);
    const matchNomeParcela = String(nomeOriginal).match(/^(.*?)\s*\((\d+)\/(\d+)\)$/);

    let atualParcela: number | null = null;
    let totalParcelas: number | null = null;
    let nomeBaseOriginal = nomeOriginal;

    if (matchColParcela) {
      atualParcela = parseInt(matchColParcela[1], 10);
      totalParcelas = parseInt(matchColParcela[2], 10);
    } else if (matchNomeParcela) {
      atualParcela = parseInt(matchNomeParcela[2], 10);
      totalParcelas = parseInt(matchNomeParcela[3], 10);
    }

    if (matchNomeParcela) {
      nomeBaseOriginal = matchNomeParcela[1].trim();
    } else {
      nomeBaseOriginal = nomeOriginal.replace(/\s*\(\d+\/\d+\)$/, '').trim();
    }

    const novoNomeDigitado = name.trim();
    const matchNovoNome = novoNomeDigitado.match(/^(.*?)\s*\(\d+\/\d+\)$/);
    const novoNomeBase = matchNovoNome ? matchNovoNome[1].trim() : novoNomeDigitado;

    const nomeFinalAtual =
      atualParcela && totalParcelas && totalParcelas > 1
        ? `${novoNomeBase} (${atualParcela}/${totalParcelas})`
        : novoNomeDigitado;

    const valorNumerico = this.parseValor(valor);
    const tipoFinal = this.tipoPlanilha(categoria);

    const novaLinha = [
      nomeFinalAtual,
      linha[1] ?? '',
      valorNumerico,
      linha[3] ?? '',
      tipoFinal,
    ];

    if (novoMes === mes) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `'${aba}'!A${rowIndex}:E${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [novaLinha] },
      });
    } else {
      // Mudou de mês: grava na aba nova e só depois apaga a linha antiga
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `'${abaNova}'!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [novaLinha] },
      });

      const sheetId = await this.getSheetId(sheets, aba);
      if (sheetId === null) throw new Error(`Aba "${aba}" não encontrada`);
      await this.excluirLinha(sheets, sheetId, rowIndex);
    }

    // Se for parcelado e solicitado atualizar parcelas futuras:
    if (
      atualizarFuturas &&
      atualParcela !== null &&
      totalParcelas !== null &&
      atualParcela < totalParcelas
    ) {
      for (let p = atualParcela + 1; p <= totalParcelas; p++) {
        let mesAlvo = mes + (p - atualParcela);
        while (mesAlvo > 12) mesAlvo -= 12;
        while (mesAlvo < 1) mesAlvo += 12;

        const abaAlvo = this.MONTH_NAMES[mesAlvo];
        if (!abaAlvo) continue;

        try {
          const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `'${abaAlvo}'!A2:E1000`,
          });
          const rows = resp.data.values || [];

          const targetIdx = rows.findIndex((r) => {
            const rNome = String(r[0] || '').trim();
            const rParc = String(r[1] || '').trim();
            const esperadoNome = `${nomeBaseOriginal} (${p}/${totalParcelas})`;
            const esperadoParc = `${p}/${totalParcelas}`;

            if (
              rParc === esperadoParc &&
              (rNome === esperadoNome || rNome.startsWith(nomeBaseOriginal))
            ) {
              return true;
            }
            if (rNome === esperadoNome) {
              return true;
            }
            return false;
          });

          if (targetIdx !== -1) {
            const rowNum = targetIdx + 2;
            const rowAntiga = rows[targetIdx];
            const nomeFuturo = `${novoNomeBase} (${p}/${totalParcelas})`;
            const linhaFuturaAtualizada = [
              nomeFuturo,
              rowAntiga[1] || `${p}/${totalParcelas}`,
              valorNumerico,
              rowAntiga[3] || '',
              tipoFinal,
            ];

            await sheets.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `'${abaAlvo}'!A${rowNum}:E${rowNum}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [linhaFuturaAtualizada] },
            });
          }
        } catch (err) {
          console.error(
            `Erro ao atualizar parcela futura ${p}/${totalParcelas} na aba ${abaAlvo}:`,
            err,
          );
        }
      }
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
        // rowIndex é o número da linha na planilha (a leitura começa na linha 2)
        .map((row, i) => ({ row, rowIndex: i + 2 }))
        .filter(({ row }) => {
          const nome = row[0];
          const valorRaw = row[2];
          const tipo = String(row[4] ?? '').trim().toLowerCase();
          return nome && valorRaw && tipo === tipoAlvo;
        })
        .map(({ row, rowIndex }) => ({
          name: row[0] as string,
          valor: this.parseValor(row[2]),
          parcela: (row[1] as string) ?? '',
          data: (row[3] as string) ?? '',
          rowIndex,
        }));

      return transacoes.slice(-5).reverse();
    } catch (error) {
      return [];
    }
  }
}
