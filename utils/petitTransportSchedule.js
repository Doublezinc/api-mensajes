const CONFIG = require('../config/petits-transports');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Fecha actual (YYYY-MM-DD) en la zona horaria del negocio
const todayInTimezone = (now = new Date(), timezone = CONFIG.timezone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const weekdayOf = (isoDate) => new Date(`${isoDate}T12:00:00Z`).getUTCDay();

const isValidIsoDate = (isoDate) => {
  if (!DATE_PATTERN.test(String(isoDate || ''))) return false;
  const date = new Date(`${isoDate}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === isoDate;
};

// Rango de fechas reservables: desde hoy + minDaysAhead hasta hoy + bookingWindowDays
const bookableRange = (now = new Date(), config = CONFIG) => {
  const today = todayInTimezone(now, config.timezone);
  return {
    from: addDays(today, config.minDaysAhead),
    to: addDays(today, config.bookingWindowDays)
  };
};

const upcomingServiceDates = (now = new Date(), config = CONFIG) => {
  const { from, to } = bookableRange(now, config);
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (config.weekdays.includes(weekdayOf(date))) dates.push(date);
  }
  return dates;
};

// Devuelve un mensaje de error si la fecha/hora no es reservable, o null si es válida
const validateBookingSlot = (date, slot, now = new Date(), config = CONFIG) => {
  if (!isValidIsoDate(date)) return 'Fecha inválida';
  if (!config.weekdays.includes(weekdayOf(date))) return 'Los petits transports solo se reservan lunes y martes';
  const { from, to } = bookableRange(now, config);
  if (date < from || date > to) return 'La fecha está fuera del periodo de reservas';
  if (!config.slots.includes(slot)) return 'Hora no disponible';
  return null;
};

const priceForItems = (items, config = CONFIG) => {
  const price = config.prices[Number(items)];
  return Number.isFinite(price) ? price : null;
};

module.exports = {
  todayInTimezone,
  addDays,
  weekdayOf,
  isValidIsoDate,
  bookableRange,
  upcomingServiceDates,
  validateBookingSlot,
  priceForItems
};
