import PDFDocument from 'pdfkit';

const SUMMARY_COLS = [
  { key: 'teamName', label: 'Squadra', width: 160 },
  { key: 'totalScore', label: 'Punti', width: 70 },
  { key: 'correctCount', label: 'Corrette', width: 80 },
  { key: 'wrongCount', label: 'Sbagliate', width: 80 },
  { key: 'noAnswerCount', label: 'Non risp.', width: 80 },
  { key: 'avgTimeSec', label: 'Tempo medio (s)', width: 110 },
];

const DETAIL_COLS = [
  { key: 'teamName', label: 'Squadra', width: 100 },
  { key: 'questionIndex', label: '#', width: 25 },
  { key: 'questionText', label: 'Domanda', width: 200 },
  { key: 'answerText', label: 'Risposta', width: 100 },
  { key: 'status', label: 'Esito', width: 100 },
  { key: 'timeSec', label: 'Tempo (s)', width: 65 },
  { key: 'points', label: 'Punti', width: 55 },
];

function drawTable(doc, columns, rows, startY) {
  const left = doc.page.margins.left;
  const bottom = doc.page.height - doc.page.margins.bottom;
  const rowHeight = 20;
  let y = startY;

  function drawHeader() {
    let x = left;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    columns.forEach((col) => {
      doc.text(col.label, x, y, { width: col.width - 8 });
      x += col.width;
    });
    y += rowHeight;
    doc.moveTo(left, y - 4).lineTo(x, y - 4).strokeColor('#ccc').stroke();
    doc.font('Helvetica').fontSize(9);
  }

  drawHeader();
  rows.forEach((row) => {
    if (y + rowHeight > bottom) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      y = doc.page.margins.top;
      drawHeader();
    }
    let x = left;
    columns.forEach((col) => {
      const val = row[col.key];
      doc.text(val === null || val === undefined ? '-' : String(val), x, y, {
        width: col.width - 8,
        ellipsis: true,
      });
      x += col.width;
    });
    y += rowHeight;
  });

  return y;
}

export function streamPdf(results, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="risultati-${results.code}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').text(results.eventTitle || results.quizTitle, {
    align: 'center',
  });
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#555')
    .text(`Codice partita: ${results.code}  ·  Generato il ${results.generatedAt.toLocaleString('it-IT')}`, {
      align: 'center',
    });
  doc.fillColor('#000');
  doc.moveDown(1.2);

  doc.fontSize(14).font('Helvetica-Bold').text('Classifica finale', doc.page.margins.left, doc.y);
  doc.moveDown(0.4);
  const afterSummaryY = drawTable(doc, SUMMARY_COLS, results.summary, doc.y);

  doc.y = afterSummaryY + 24;
  doc.fontSize(14).font('Helvetica-Bold').text('Dettaglio risposte per squadra', doc.page.margins.left, doc.y);
  doc.moveDown(0.4);
  drawTable(doc, DETAIL_COLS, results.detail, doc.y);

  doc.end();
}
