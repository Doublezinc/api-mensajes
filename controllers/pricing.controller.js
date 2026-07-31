const { request, response } = require('express');
const { databaseIsReady } = require('../config/database');
const PricingRules = require('../models/pricing.modelo');
const DEFAULTS = require('../config/pricing-defaults');

const SINGLETON_FILTER = {};

const EDITABLE_FIELDS = [
  'currency',
  'crewSize',
  'hourlyRatePerMover',
  'hourlyRateTwoMoversTruck20Ft',
  'hourlyRateThreeMoversTruck20Ft',
  'hourlyCrewRates',
  'minimumHours',
  'transportationFee',
  'furnitureApplianceDeliveryFee',
  'fixedRateFee',
  'stairFeePerFloor',
  'protectionMaterialsFee',
  'packingMaterialsFee',
  'additionalStopFee',
  'deposit',
  'gstRate',
  'qstRate',
  'cancellationDeadlineHours'
];

const normalizeRules = (rules) => {
  const normalized = { ...DEFAULTS, ...rules };
  if (!Array.isArray(normalized.hourlyCrewRates) || normalized.hourlyCrewRates.length === 0) {
    normalized.hourlyCrewRates = [
      {
        movers: 2,
        truck: '20 pies',
        hourlyRate: normalized.hourlyRateTwoMoversTruck20Ft,
        active: true
      },
      {
        movers: 3,
        truck: '20 pies',
        hourlyRate: normalized.hourlyRateThreeMoversTruck20Ft,
        active: true
      }
    ];
  }
  return normalized;
};

const obtenerReglas = async (req = request, res = response) => {
  if (!databaseIsReady()) {
    return res.json({ ok: true, item: DEFAULTS, persisted: false });
  }

  try {
    let doc = await PricingRules.findOne(SINGLETON_FILTER).lean();
    if (!doc) {
      doc = (await PricingRules.create(DEFAULTS)).toObject();
    }
    doc = normalizeRules(doc);
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
      Object.entries(DEFAULTS).forEach(([field, value]) => {
        if (doc[field] === undefined) doc[field] = value;
      });
      if (!Array.isArray(doc.hourlyCrewRates) || doc.hourlyCrewRates.length === 0) {
        doc.hourlyCrewRates = normalizeRules(doc.toObject()).hourlyCrewRates;
      }
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
