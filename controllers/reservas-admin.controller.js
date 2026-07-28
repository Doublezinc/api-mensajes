const { request, response } = require('express');
const { databaseIsReady } = require('../config/database');
const Reserva = require('../models/reserva.modelo');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureDatabase = (res) => {
  if (databaseIsReady()) return true;
  res.status(503).json({
    ok: false,
    message: 'La base de datos no está disponible'
  });
  return false;
};

const listarReservas = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const search = String(req.query.search || '').trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { quoteId: pattern },
      { 'contact.firstName': pattern },
      { 'contact.lastName': pattern },
      { 'contact.email': pattern },
      { 'contact.phone': pattern },
      { 'addresses.departure.city': pattern },
      { 'addresses.destination.city': pattern }
    ];
  }

  try {
    const [items, total] = await Promise.all([
      Reserva.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Reserva.countDocuments(filter)
    ]);

    return res.json({
      ok: true,
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    console.error('Error al listar reservas:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible consultar las reservas' });
  }
};

const obtenerReserva = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  try {
    const item = await Reserva.findOne({ quoteId: req.params.quoteId }).lean();
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }
    return res.json({ ok: true, item });
  } catch (error) {
    console.error('Error al consultar la reserva:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible consultar la reserva' });
  }
};

const actualizarEstado = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  try {
    if (['deposit_received', 'confirmed'].includes(req.body.status)) {
      const current = await Reserva.findOne({ quoteId: req.params.quoteId })
        .select('depositStatus')
        .lean();
      if (!current) {
        return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
      }
      if (current.depositStatus !== 'received') {
        return res.status(409).json({
          ok: false,
          message: 'No se puede avanzar la reserva antes de registrar el depósito'
        });
      }
    }

    const item = await Reserva.findOneAndUpdate(
      { quoteId: req.params.quoteId },
      {
        $set: {
          status: req.body.status,
          statusNotes: req.body.notes || '',
          statusUpdatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    return res.json({ ok: true, item });
  } catch (error) {
    console.error('Error al actualizar la reserva:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible actualizar la reserva' });
  }
};

const registrarDeposito = async (req = request, res = response) => {
  if (!ensureDatabase(res)) return;

  try {
    const received = req.body.received;
    const item = await Reserva.findOneAndUpdate(
      { quoteId: req.params.quoteId },
      {
        $set: {
          depositStatus: received ? 'received' : 'pending',
          depositReceivedAt: received ? new Date() : null,
          depositReference: req.body.reference || '',
          status: received ? 'deposit_received' : 'awaiting_deposit',
          statusUpdatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    return res.json({ ok: true, item });
  } catch (error) {
    console.error('Error al registrar el depósito:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible registrar el depósito' });
  }
};

module.exports = {
  listarReservas,
  obtenerReserva,
  actualizarEstado,
  registrarDeposito
};
