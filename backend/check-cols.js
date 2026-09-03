require('dotenv').config();
const { google } = require('googleapis');

async function run() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'CASA!1:1', // Pega a primeira linha inteira da aba CASA
    });

    const row = response.data.values ? response.data.values[0] : [];
    console.log(`\n=== RESULTADO ===`);
    console.log(`Quantidade de colunas com dados na Linha 1: ${row.length}`);
    console.log(`Valores encontrados na Linha 1: ${JSON.stringify(row)}`);
    console.log(`=================\n`);
  } catch (error) {
    console.error('Erro ao acessar a planilha:', error.message);
  }
}
run();
