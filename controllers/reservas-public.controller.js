const crypto = require('crypto');
const { request, response } = require('express');
const { databaseIsReady } = require('../config/database');
const Reserva = require('../models/reserva.modelo');
const { createContractPdf } = require('../utils/contractPdf');

const descargarContrato = async (req = request, res = response) => {
  if (!databaseIsReady()) {
    return res.status(503).json({ ok: false, message: 'La base de datos no está disponible' });
  }

  const token = req.header('x-contract-token') || '';
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Acceso al contrato no autorizado' });
  }

  try {
    const reservation = await Reserva.findOne({ quoteId: req.params.quoteId })
      .select('+contractAccessTokenHash');

    if (!reservation) {
      return res.status(404).json({ ok: false, message: 'Contrato no encontrado' });
    }

    const providedHash = crypto.createHash('sha256').update(token).digest('hex');
    const expected = Buffer.from(reservation.contractAccessTokenHash || '', 'utf8');
    const provided = Buffer.from(providedHash, 'utf8');
    const authorized = expected.length === provided.length
      && crypto.timingSafeEqual(expected, provided);

    if (!authorized) {
      return res.status(401).json({ ok: false, message: 'Acceso al contrato no autorizado' });
    }

    const pdf = await createContractPdf(reservation.toObject());
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contrat-${reservation.quoteId}.pdf"`,
      'Content-Length': pdf.length,
      'Cache-Control': 'private, no-store'
    });
    return res.send(pdf);
  } catch (error) {
    console.error('Error al generar el contrato:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible generar el contrato' });
  }
};

module.exports = {
  descargarContrato
};
