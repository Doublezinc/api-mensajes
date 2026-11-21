const { escapeHtml } = require('./escapeHtml');
const CONFIG = require('../config/petits-transports');

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const formatDate = (isoDate) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const label = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
  return `${DAY_NAMES[date.getUTCDay()]} ${label}`;
};

const money = (value) => new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: CONFIG.currency
}).format(Number(value || 0));

const address = (value = {}) => {
  const base = [value.street, value.city, value.postalCode].filter(Boolean).join(', ');
  const access = value.floor && value.floor !== '0'
    ? ` (étage ${value.floor}${value.elevator ? ', ascenseur' : ', sans ascenseur'})`
    : '';
  return `${base}${access}`;
};

const priceLabel = (booking) => {
  const p = booking.pricing;
  if (!p || p.base === undefined) return `${money(booking.price)} + taxes`;
  const parts = [`base ${money(p.base)}`];
  if (p.zone) parts.push(`zone ${p.zone} : ${money(p.distanceFee)}`);
  if (p.stairsFee) parts.push(`escaliers : ${money(p.stairsFee)}`);
  const detail = parts.join(' · ');
  return p.custom
    ? `À partir de ${money(p.total)} + taxes — hors zone, prix final à confirmer (${detail})`
    : `${money(p.total)} + taxes (${detail})`;
};

const line = (label, value) =>
  `<tr><td style="padding:7px 12px;color:#606775;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 12px;font-weight:700">${escapeHtml(value)}</td></tr>`;

const shell = (title, content) => `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#18181b">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px">
      <div style="background:#0e0e0e;color:#fff;padding:24px 28px;border-top:5px solid #e8171f">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#d4d4d8">Groupe Double Z · Petits transports</div>
        <h1 style="margin:8px 0 0;font-size:25px">${escapeHtml(title)}</h1>
      </div>
      <div style="background:#fff;padding:28px">${content}</div>
    </div>
  </body>
</html>`;

const detailsTable = (booking) => `
  <table style="width:100%;border-collapse:collapse">
    ${line('Numéro', booking.bookingId)}
    ${line('Date', formatDate(booking.date))}
    ${line('Heure', booking.slot)}
    ${line('Articles', `${booking.items} — ${booking.itemsDescription}`)}
    ${line('Départ', address(booking.addresses.pickup))}
    ${line('Livraison', address(booking.addresses.delivery))}
    ${line('Prix', priceLabel(booking))}
  </table>`;

const crearHtmlPetitTransportInterno = (booking) => shell(`Petit transport ${booking.bookingId}`, `
  <p>Nouvelle demande de petit transport. Le créneau est bloqué dans le calendrier en attendant votre confirmation.</p>
  ${detailsTable(booking)}
  <table style="width:100%;border-collapse:collapse;margin-top:14px">
    ${line('Client', booking.contact.name)}
    ${line('Téléphone', booking.contact.phone)}
    ${line('Courriel', booking.contact.email || '—')}
    ${line('Notes', booking.notes || '—')}
    ${line('Zone acceptée', booking.serviceAreaAccepted ? 'Oui' : 'Non')}
  </table>
  <p style="margin-top:18px;color:#606775">L'événement de calendrier (.ics) est joint à ce courriel.</p>`);

const crearHtmlPetitTransportCliente = (booking) => shell('Votre demande de transport est reçue', `
  <p>Bonjour ${escapeHtml(booking.contact.name)},</p>
  <p>Merci ! Votre demande de petit transport est reçue. <strong>GROUPE DOUBLE Z INC</strong> vous contactera pour confirmer les détails.</p>
  ${detailsTable(booking)}
  <p style="margin-top:18px;padding:12px;background:#f4f4f5;border-left:4px solid #e8171f;font-size:13px">${escapeHtml(CONFIG.serviceAreaNote)}</p>
  <p>Questions ? Appelez-nous au 514 234-9971.</p>`);

module.exports = {
  formatDate,
  crearHtmlPetitTransportInterno,
  crearHtmlPetitTransportCliente
};
