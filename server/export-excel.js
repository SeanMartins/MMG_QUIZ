import ExcelJS from 'exceljs';

export async function buildExcelBuffer(results) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Quiz Live';
  wb.created = results.generatedAt;

  const summarySheet = wb.addWorksheet('Riepilogo');
  summarySheet.columns = [
    { header: 'Squadra', key: 'teamName', width: 26 },
    { header: 'Punteggio', key: 'totalScore', width: 12 },
    { header: 'Risposte corrette', key: 'correctCount', width: 16 },
    { header: 'Risposte sbagliate', key: 'wrongCount', width: 16 },
    { header: 'Nessuna risposta', key: 'noAnswerCount', width: 16 },
    { header: 'Tempo medio (s)', key: 'avgTimeSec', width: 16 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  results.summary.forEach((r) => summarySheet.addRow(r));

  const detailSheet = wb.addWorksheet('Dettaglio risposte');
  detailSheet.columns = [
    { header: 'Squadra', key: 'teamName', width: 26 },
    { header: '#', key: 'questionIndex', width: 6 },
    { header: 'Domanda', key: 'questionText', width: 45 },
    { header: 'Risposta data', key: 'answerText', width: 22 },
    { header: 'Esito', key: 'status', width: 16 },
    { header: 'Tempo (s)', key: 'timeSec', width: 12 },
    { header: 'Punti', key: 'points', width: 10 },
  ];
  detailSheet.getRow(1).font = { bold: true };
  results.detail.forEach((r) => detailSheet.addRow(r));

  return wb.xlsx.writeBuffer();
}
