const { request, response } = require('express');
const { databaseIsReady } = require('../config/database');
const PricingRules = require('../models/pricing.modelo');
const DEFAULTS = require('../config/pricing-defaults');

const SINGLETON_FILTER = {};

const EDITABLE_FIELDS = [
  'currency',
  'crewSize',
  'hourlyRatePerMover',
  'minimumHours',
  'transportationFee',
  'stairFeePerFloor',
  'protectionMaterialsFee',
  'packingMaterialsFee',
  'additionalStopFee',
  'deposit',
  'gstRate',
  'qstRate',
  'cancellationDeadlineHours'
];

const obtenerReglas = async (req = request, res = response) => {
  if (!databaseIsReady()) {
    return res.json({ ok: true, item: DEFAULTS, persisted: false });
  }

  try {
    let doc = await PricingRules.findOne(SINGLETON_FILTER).lean();
    if (!doc) {
      doc = (await PricingRules.create(DEFAULTS)).toObject();
    }
    return res.json({ ok: true, item: doc, persisted: true });
  } catch (error) {
    console.error('Error al consultar las tarifas:', error);
    return res.json({ ok: true, item: DEFAULTS, persisted: false });
  }
};

const actualizarReglas = async (req = request, res = response) => {
  if (!databaseIsReady()) {
    return res.status(503).json({ ok: false, message: 'La base de datos no está disponible' });
  }

  try {
    const patch = {};
    EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) patch[field] = req.body[field];
    });

    let doc = await PricingRules.findOne(SINGLETON_FILTER);
    if (!doc) {
      doc = new PricingRules({ ...DEFAULTS, ...patch });
    } else {
      Object.assign(doc, patch);
    }
    doc.version = `custom-${Date.now()}`;
    doc.updatedAt = new Date();

    await doc.save();
    return res.json({ ok: true, item: doc.toObject() });
  } catch (error) {
    console.error('Error al actualizar las tarifas:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible actualizar las tarifas' });
  }
};

module.exports = {
  obtenerReglas,
  actualizarReglas
};
