const crypto = require('crypto');
const { request, response } = require('express');
const { databaseIsReady } = require('../config/database');
const CONFIG = require('../config/petits-transports');
const PetitTransport = require('../models/petit-transport.modelo');
const { sendMailPetitTransport } = require('../helpers/createEmail');
const { createPetitTransportIcs } = require('../utils/petitTransportIcs');
const { computePrice } = require('../utils/petitTransportPricing');
const {
  bookableRange,
  upcomingServiceDates,
  validateBookingSlot,
  priceForItems,
  weekdayOf
} = require('../utils/petitTransportSchedule');

const ACTIVE_STATUSES = ['pending', 'confirmed', 'completed'];

const ensureDatabase = (res) => {
  if (databaseIsReady()) return true;
  res.status(503).json({ ok: false, message: 'La base de datos no está disponible' });
  return false;
};

const slotKeyFor = (date, slot) => `${date}T${slot}`;

const createBookingId = (date) => {
  const random = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 7);
  return `PT-${date.replace(/-/g, '')}-${random}`;
};

const publicConfig = () => ({
  currency: CONFIG.currency,
  weekdays: CONFIG.weekdays,
  slots: CONFIG.slots,
  prices: CONFIG.prices,
  maxItems: CONFIG.maxItems,
  serviceArea: CONFIG.serviceArea,
  serviceAreaNote: CONFIG.serviceAreaNote
});

const obtenerDisponibilidad = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  try {
    const dates = upcomingServiceDates();
    const { from, to } = bookableRange();
    const taken = await PetitTransport.find({
      date: { $gte: from, $lte: to },
      slotKey: { $exists: true }
    }).select('date slot').lean();
    const takenKeys = new Set(taken.map(item => slotKeyFor(item.date, item.slot)));

    const days = dates.map(date => ({
      date,
      weekday: weekdayOf(date),
      slots: CONFIG.slots.map(time => ({
        time,
        available: !takenKeys.has(slotKeyFor(date, time))
      }))
    }));

    return res.json({ ok: true, config: publicConfig(), days });
  } catch (error) {
    console.error('Error al consultar la disponibilidad:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible consultar la disponibilidad' });
  }
};

const crearPetitTransport = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  const { date, slot } = req.body;
  const slotError = validateBookingSlot(date, slot);
  if (slotError) {
    return res.status(400).json({ ok: false, message: slotError });
  }

  const items = Number(req.body.items);
  const addresses = req.body.addresses || {};
  // Precio: base + zona (ciudad más lejana) + escaleras sin ascensor. Siempre se calcula en el servidor.
  const pricing = priceForItems(items) === null ? null : computePrice({
    items,
    pickup: addresses.pickup,
    delivery: addresses.delivery
  });
  if (pricing === null) {
    return res.status(400).json({ ok: false, message: 'Cantidad de artículos inválida' });
  }

  let booking;
  try {
    booking = await PetitTransport.create({
      bookingId: createBookingId(date),
      date,
      slot,
      slotKey: slotKeyFor(date, slot),
      items,
      price: pricing.total,
      pricing,
      currency: CONFIG.currency,
      itemsDescription: req.body.itemsDescription,
      contact: req.body.contact,
      addresses: req.body.addresses,
      notes: req.body.notes || '',
      serviceAreaAccepted: true,
      language: req.body.language || 'fr'
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.slotKey) {
      return res.status(409).json({
        ok: false,
        code: 'slot_taken',
        message: 'Esta hora acaba de ser reservada. Elija otra hora.'
      });
    }
    console.error('Error al crear el petit transport:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible registrar la solicitud' });
  }

  // La reserva ya está guardada: un fallo del correo no debe impedir responder al cliente
  try {
    const bookingData = booking.toObject();
    const emailSent = await sendMailPetitTransport(bookingData, createPetitTransportIcs(bookingData));
    await PetitTransport.updateOne(
      { _id: booking._id },
      { $set: { emailStatus: emailSent ? 'sent' : 'failed' } }
    );
  } catch (error) {
    console.error('Error al notificar el petit transport:', error);
  }

  return res.status(201).json({
    ok: true,
    bookingId: booking.bookingId,
    date: booking.date,
    slot: booking.slot,
    items: booking.items,
    price: booking.price,
    pricing: booking.pricing,
    currency: booking.currency,
    status: booking.status,
    message: 'Solicitud de transporte recibida'
  });
};

const listarPetitsTransports = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }

  try {
    const items = await PetitTransport.find(filter)
      .sort({ date: 1, slot: 1 })
      .limit(500)
      .lean();
    return res.json({ ok: true, items });
  } catch (error) {
    console.error('Error al listar los petits transports:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible consultar los petits transports' });
  }
};

const actualizarEstadoPetitTransport = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  try {
    const current = await PetitTransport.findOne({ bookingId: req.params.bookingId }).lean();
    if (!current) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    const status = req.body.status;
    const update = {
      $set: {
        status,
        statusNotes: req.body.notes || '',
        statusUpdatedAt: new Date()
      }
    };

    // Cancelar libera el créneau; reactivar lo vuelve a bloquear si sigue libre
    if (status === 'cancelled') {
      update.$unset = { slotKey: 1 };
    } else if (ACTIVE_STATUSES.includes(status) && !current.slotKey) {
      update.$set.slotKey = slotKeyFor(current.date, current.slot);
    }

    const item = await PetitTransport.findOneAndUpdate(
      { bookingId: req.params.bookingId },
      update,
      { new: true, runValidators: true }
    ).lean();

    return res.json({ ok: true, item });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: 'El créneau ya fue ocupado por otra reserva'
      });
    }
    console.error('Error al actualizar el petit transport:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible actualizar el petit transport' });
  }
};

module.exports = {
  obtenerDisponibilidad,
  crearPetitTransport,
  listarPetitsTransports,
  actualizarEstadoPetitTransport
};
