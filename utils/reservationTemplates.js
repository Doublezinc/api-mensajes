const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = (value) => new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD'
}).format(Number(value || 0));

const line = (label, value) =>
  `<tr><td style="padding:7px 12px;color:#606775;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 12px;font-weight:700">${escapeHtml(value)}</td></tr>`;

const address = (value = {}) =>
  [value.street, value.city, value.postalCode].filter(Boolean).join(', ');

const inventory = (details = {}) => {
  const items = { ...(details.inventory || {}), ...(details.appliances || {}) };
  const selected = Object.entries(items)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([name, quantity]) => `${name}: ${quantity}`);
  return selected.length ? selected.join(', ') : 'Aucun article détaillé';
};

const shell = (title, content) => `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#18181b">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px">
      <div style="background:#0e0e0e;color:#fff;padding:24px 28px;border-top:5px solid #e8171f">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#d4d4d8">Transport Double Z</div>
        <h1 style="margin:8px 0 0;font-size:25px">${escapeHtml(title)}</h1>
      </div>
      <div style="background:#fff;padding:28px">${content}</div>
    </div>
  </body>
</html>`;

const depositBlock = (deposit, labels) => `
  <div style="margin:22px 0;padding:20px;background:#f4f4f5;border-left:4px solid #e8171f">
    <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(labels.title)}</h2>
    ${deposit.isExample ? `<p style="padding:9px;background:#fef2f2;color:#991b1b;font-weight:700">${escapeHtml(labels.example)}</p>` : ''}
    <table style="width:100%;border-collapse:collapse">
      ${line(labels.method, deposit.method)}
      ${line(labels.recipient, deposit.recipient)}
      ${line(labels.email, deposit.email)}
      ${line(labels.phone, deposit.phone)}
      ${line(labels.amount, money(deposit.amount))}
      ${line(labels.reference, deposit.reference)}
      ${line(labels.deadline, `${deposit.deadlineHours} h`)}
    </table>
    <p style="margin:12px 0 0">${escapeHtml(deposit.note)}</p>
  </div>`;

const crearHtmlReservaInterna = (body) => {
  const { quoteId, contact, addresses, details, reservation, estimate, depositInstructions } = body;
  return shell(`Nouvelle demande ${quoteId}`, `
    <p>Une demande avec conditions acceptées a été enregistrée. Son statut initial est <strong>acompte en attente</strong>.</p>
    <table style="width:100%;border-collapse:collapse">
      ${line('Numéro', quoteId)}
      ${line('Client', `${contact.firstName} ${contact.lastName}`)}
      ${line('Courriel', contact.email)}
      ${line('Téléphone', contact.phone)}
      ${line('Date du déménagement', contact.moveDate)}
      ${line('Départ', address(addresses.departure))}
      ${line('Arrivée', address(addresses.destination))}
      ${line('Inventaire', inventory(details))}
      ${line('Estimation', `${money(estimate.totalLow)} - ${money(estimate.totalHigh)}`)}
      ${line('Acompte requis', money(depositInstructions.amount))}
      ${line('Conditions', `${reservation.termsVersion} - ${reservation.acceptedAt}`)}
    </table>
    <p><strong>La date ne doit être confirmée qu’après vérification du dépôt.</strong></p>
    ${details.notes ? `<p><strong>Notes :</strong> ${escapeHtml(details.notes)}</p>` : ''}
    <p>Le contrat PDF est joint à ce courriel.</p>
  `);
};

const CLIENT_COPY = {
  fr: {
    title: 'Demande reçue', hello: 'Bonjour', received: 'Nous avons reçu votre demande et votre acceptation des conditions.',
    pending: 'Votre date n’est pas encore réservée. Elle sera bloquée lorsque Transport Double Z aura confirmé la réception de l’acompte.',
    moveDate: 'Date du déménagement', route: 'Trajet', estimate: 'Estimation',
    contract: 'Votre contrat est joint à ce courriel.',
    nonRefundable: 'L’acompte versé n’est pas remboursable en cas d’annulation par le client.',
    keep: 'Conservez ce numéro pour toute communication.',
    deposit: { title: 'Dépôt à effectuer', example: 'Attention : ces coordonnées sont des données d’exemple.', method: 'Méthode', recipient: 'Destinataire', email: 'Courriel', phone: 'Téléphone', amount: 'Montant', reference: 'Référence', deadline: 'Délai' }
  },
  en: {
    title: 'Request received', hello: 'Hello', received: 'We received your request and acceptance of the terms.',
    pending: 'Your date is not reserved yet. It will be held once Transport Double Z confirms receipt of the deposit.',
    moveDate: 'Moving date', route: 'Route', estimate: 'Estimate',
    contract: 'Your contract is attached to this email.',
    nonRefundable: 'The deposit is non-refundable if the client cancels.',
    keep: 'Keep this number for all communications.',
    deposit: { title: 'Deposit instructions', example: 'Warning: these are example payment details.', method: 'Method', recipient: 'Recipient', email: 'Email', phone: 'Phone', amount: 'Amount', reference: 'Reference', deadline: 'Deadline' }
  },
  es: {
    title: 'Solicitud recibida', hello: 'Hola', received: 'Recibimos su solicitud y la aceptación de las condiciones.',
    pending: 'Su fecha todavía no está reservada. Se bloqueará cuando Transport Double Z confirme la recepción del anticipo.',
    moveDate: 'Fecha de mudanza', route: 'Trayecto', estimate: 'Estimación',
    contract: 'Su contrato está adjunto a este correo.',
    nonRefundable: 'El anticipo no es reembolsable si el cliente cancela.',
    keep: 'Conserve este número para cualquier comunicación.',
    deposit: { title: 'Datos para el anticipo', example: 'Atención: estos son datos de pago de ejemplo.', method: 'Método', recipient: 'Destinatario', email: 'Correo', phone: 'Teléfono', amount: 'Importe', reference: 'Referencia', deadline: 'Plazo' }
  }
};

const crearHtmlConfirmacionCliente = (body) => {
  const { quoteId, language, contact, addresses, estimate, depositInstructions } = body;
  const copy = CLIENT_COPY[language] || CLIENT_COPY.fr;
  return shell(`${copy.title} - ${quoteId}`, `
    <p>${escapeHtml(copy.hello)} ${escapeHtml(contact.firstName)},</p>
    <p>${escapeHtml(copy.received)}</p>
    <p style="padding:14px;background:#fff7ed;border-left:4px solid #f97316"><strong>${escapeHtml(copy.pending)}</strong></p>
    <table style="width:100%;border-collapse:collapse">
      ${line(copy.moveDate, contact.moveDate)}
      ${line(copy.route, `${address(addresses.departure)} - ${address(addresses.destination)}`)}
      ${line(copy.estimate, `${money(estimate.totalLow)} - ${money(estimate.totalHigh)}`)}
    </table>
    ${depositBlock(depositInstructions, copy.deposit)}
    <p><strong>${escapeHtml(copy.nonRefundable)}</strong></p>
    <p>${escapeHtml(copy.contract)}</p>
    <p>${escapeHtml(copy.keep)} <strong>${escapeHtml(quoteId)}</strong></p>
  `);
};

module.exports = {
  crearHtmlReservaInterna,
  crearHtmlConfirmacionCliente
};
