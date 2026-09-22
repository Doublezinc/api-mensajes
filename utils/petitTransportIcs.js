const CONFIG = require('../config/petits-transports');

const escapeIcs = (value = '') => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/([,;])/g, '\\$1');

// Divide líneas largas según RFC 5545 (máx. 75 octetos por línea)
const fold = (line) => {
  const chunks = [];
  let rest = line;
  while (Buffer.byteLength(rest, 'utf8') > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 75) cut--;
    chunks.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  chunks.push(rest);
  return chunks.join('\r\n');
};

const localStamp = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

const endTime = (time, minutes) => {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const address = (value = {}) => [value.street, value.city, value.postalCode].filter(Boolean).join(', ');

// Genera un evento de calendario (.ics) para el petit transport
const createPetitTransportIcs = (booking, config = CONFIG) => {
  const utcStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const description = [
    `Réservation ${booking.bookingId}`,
    `Client : ${booking.contact.name} (${booking.contact.phone})`,
    `Articles (${booking.items}) : ${booking.itemsDescription}`,
    `Départ : ${address(booking.addresses.pickup)}`,
    `Livraison : ${address(booking.addresses.delivery)}`,
    `Prix : ${booking.price} $`,
    booking.notes ? `Notes : ${booking.notes}` : ''
  ].filter(Boolean).join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Groupe Double Z//Petits transports//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${config.timezone}`,
    'BEGIN:STANDARD',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${booking.bookingId}@transportdoublez.com`,
    `DTSTAMP:${utcStamp}`,
    `DTSTART;TZID=${config.timezone}:${localStamp(booking.date, booking.slot)}`,
    `DTEND;TZID=${config.timezone}:${localStamp(booking.date, endTime(booking.slot, config.slotDurationMinutes))}`,
    `SUMMARY:${escapeIcs(`Petit transport · ${booking.contact.name} · ${booking.items} article(s)`)}`,
    `LOCATION:${escapeIcs(address(booking.addresses.pickup))}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return Buffer.from(`${lines.map(fold).join('\r\n')}\r\n`, 'utf8');
};

module.exports = {
  createPetitTransportIcs,
  endTime
};
