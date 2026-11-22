const PDFDocument = require('pdfkit');

const createQuickQuotePdf = (quote) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'LETTER', margin: 56 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const row = (label, value) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#6b7280')
      .text(label.toUpperCase(), { continued: false });
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#111827')
      .text(value || '-', { continued: false });
    doc.moveDown(0.65);
  };

  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor('#dc2626')
    .text('Groupe Double Z');

  doc
    .font('Helvetica-Bold')
    .fontSize(17)
    .fillColor('#111827')
    .text('Resume de demande rapide', { align: 'left' });

  doc
    .moveDown(0.4)
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#6b7280')
    .text(`Document genere le ${new Date().toLocaleString('fr-CA')}`);

  doc.moveDown(1.4);

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#111827')
    .text('Details de la demande');
  doc.moveDown(0.8);

  row('Depart', quote.origin);
  row('Arrivee', quote.destination);
  row('Logement', quote.housing);
  row('Pieces', quote.rooms);
  row('Acces', quote.access);
  row('Date souhaitee', quote.date);
  row('Telephone', quote.phone);
  row('Estimation indicative', quote.estimate);

  doc.moveDown(0.9);
  const depositBoxY = doc.y;
  doc
    .rect(doc.x, depositBoxY, 500, 118)
    .fill('#fee2e2');
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('Depot de reservation', 72, depositBoxY + 16, { width: 460 });
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#374151')
    .text(
      `Un depot ${quote.depositAmount} sera demande pour bloquer la date apres validation par notre equipe. Ce depot est deduit du montant final. Le prix final sera confirme par telephone selon les details reels du demenagement.`,
      72,
      depositBoxY + 42,
      { width: 460, lineGap: 3 }
    );

  doc.y = depositBoxY + 138;
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#111827')
    .text('Important');
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#4b5563')
    .text(
      "Cette demande rapide ne confirme pas automatiquement la disponibilite. L'equipe de Groupe Double Z vous contactera pour valider la date, le volume, l'acces et les modalites du depot.",
      { width: 500, lineGap: 3 }
    );

  doc.moveDown(1.4);
  doc
    .fontSize(10)
    .fillColor('#6b7280')
    .text('5142349971 | demenagement@transportdoublez.com | transportdoublez.com');

  doc.end();
});

module.exports = { createQuickQuotePdf };
