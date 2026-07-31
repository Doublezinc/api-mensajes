const PDFDocument = require('pdfkit');

const COLORS = {
  black: '#0E0E0E',
  red: '#E8171F',
  gray: '#6B7280',
  light: '#F4F4F5',
  border: '#D4D4D8',
  white: '#FFFFFF'
};

const money = (value) => `${Number(value || 0).toFixed(2).replace('.', ',')} $ CAD`;
const address = (value = {}) =>
  [value.street, value.city, value.postalCode].filter(Boolean).join(', ');

const createContractPdf = (reservation) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 48,
    bufferPages: true,
    info: {
      Title: `Entente de service ${reservation.quoteId}`,
      Author: 'Groupe Double Z',
      Subject: 'Résumé contractuel et instructions de dépôt'
    }
  });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('error', reject);
  doc.on('end', () => resolve(Buffer.concat(chunks)));

  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const contact = reservation.contact;
  const estimate = reservation.estimate;
  const deposit = reservation.depositInstructions;

  const ensureSpace = (height = 90) => {
    if (doc.y + height > doc.page.height - 60) doc.addPage();
  };
  const sectionTitle = (title) => {
    ensureSpace(55);
    doc.moveDown(0.7)
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLORS.red)
      .text(title.toUpperCase(), { characterSpacing: 1.2 });
    doc.moveDown(0.35);
  };
  const row = (label, value) => {
    ensureSpace(34);
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray).text(label, 48, y, { width: 145 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.black).text(String(value || '-'), 193, y, { width: width - 145 });
    doc.y = Math.max(doc.y, y + 20);
    doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(48, doc.y).lineTo(48 + width, doc.y).stroke();
    doc.moveDown(0.5);
  };
  const clause = (number, title, text) => {
    ensureSpace(62);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.black).text(`${number}. ${title}`);
    doc.moveDown(0.2).font('Helvetica').fontSize(9.3).fillColor('#3F3F46')
      .text(text, { lineGap: 2 });
    doc.moveDown(0.55);
  };

  doc.rect(0, 0, doc.page.width, 118).fill(COLORS.black);
  doc.rect(48, 30, 96, 26).fill(COLORS.red);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.white).text('GROUPE Z', 61, 38);
  doc.font('Helvetica-Bold').fontSize(21).fillColor(COLORS.white).text('GROUPE DOUBLE Z', 48, 70);
  doc.font('Helvetica').fontSize(9).fillColor('#D4D4D8').text('ENTENTE DE SERVICE ET RÉSERVATION', 330, 76, {
    width: 214,
    align: 'right'
  });

  doc.y = 145;
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.black).text('RÉSUMÉ CONTRACTUEL');
  doc.moveDown(0.25).font('Helvetica').fontSize(10).fillColor(COLORS.gray)
    .text(`Demande ${reservation.quoteId} - Conditions acceptées le ${new Date(reservation.reservation.acceptedAt).toLocaleString('fr-CA')}`);

  sectionTitle('Client et déménagement');
  row('Client', `${contact.firstName} ${contact.lastName}`);
  row('Coordonnées', `${contact.email} - ${contact.phone}`);
  row('Date souhaitée', contact.moveDate);
  row('Départ', address(reservation.addresses.departure));
  row('Destination', address(reservation.addresses.destination));
  row('Logement', `${reservation.details.rooms || '-'} pièce(s) - ${reservation.details.boxes || 0} boîte(s)`);

  sectionTitle('Montants');
  row('Estimation, taxes incluses', `${money(estimate.totalLow)} - ${money(estimate.totalHigh)}`);
  row('Acompte requis', money(deposit.amount));
  row('Solde', 'Payable le jour du déménagement selon le prix final');

  ensureSpace(135);
  const depositBoxY = doc.y;
  doc.roundedRect(48, depositBoxY, width, 119, 3).fill(COLORS.light);
  const depositY = depositBoxY + 16;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.red)
    .text(deposit.isExample ? 'INSTRUCTIONS DE DÉPÔT - DONNÉES D’EXEMPLE' : 'INSTRUCTIONS DE DÉPÔT', 64, depositY);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.black)
    .text(`Méthode : ${deposit.method}`, 64, depositY + 25)
    .text(`Destinataire : ${deposit.recipient}`, 64, depositY + 42)
    .text(`Courriel : ${deposit.email}`, 64, depositY + 59)
    .text(`Montant : ${money(deposit.amount)} | Référence : ${deposit.reference}`, 64, depositY + 76)
    .text(`Délai : ${deposit.deadlineHours} h. ${deposit.note}`, 64, depositY + 93, { width: width - 32 });
  doc.y = depositBoxY + 129;

  sectionTitle('Conditions de réservation');
  clause(1, 'Estimation', 'Le montant indiqué est une estimation basée sur les informations fournies par le client. Le prix final est établi selon le temps réel requis et les conditions constatées sur place.');
  clause(2, 'Acompte', `Un acompte de ${money(deposit.amount)} est requis pour bloquer la date. Il est déduit du montant final. La date n’est pas réservée avant la confirmation de réception de l’acompte par Groupe Double Z.`);
  clause(3, 'Annulation', `Si le client annule moins de ${reservation.cancellationDeadlineHours || 48} heures avant la date prévue, l’acompte versé n’est pas remboursable, car il couvre le blocage de la date et les frais administratifs. Passé ce délai, l’acompte est remboursable.`);
  clause(4, 'Accès', 'Le client s’assure que les accès et le stationnement sont disponibles. Les attentes causées par un accès bloqué sont facturées au taux horaire.');
  clause(5, 'Assurance', 'Une assurance cargo de base est incluse. Les objets de grande valeur doivent être déclarés à l’avance.');

  ensureSpace(100);
  doc.moveDown(0.5).rect(48, doc.y, width, 76).strokeColor(COLORS.black).lineWidth(1).stroke();
  const acceptedY = doc.y + 14;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.black)
    .text('ACCEPTATION ÉLECTRONIQUE ENREGISTRÉE', 62, acceptedY);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray)
    .text(`Version : ${reservation.reservation.termsVersion}`, 62, acceptedY + 22)
    .text(`Date : ${new Date(reservation.reservation.acceptedAt).toISOString()}`, 62, acceptedY + 38);
  doc.y += 90;

  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray)
      .text(
        `Groupe Double Z | ${reservation.quoteId} | Page ${pageIndex + 1} de ${range.count}`,
        48,
        doc.page.height - 28,
        { width, align: 'center', lineBreak: false }
      );
  }

  doc.end();
});

module.exports = {
  createContractPdf
};
