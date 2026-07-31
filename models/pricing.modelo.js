const { Schema, model } = require('mongoose');

const HourlyCrewRateSchema = new Schema({
  movers: { type: Number, required: true, min: 1, max: 20 },
  truck: { type: String, required: true, trim: true, default: '20 pies', maxlength: 80 },
  hourlyRate: { type: Number, required: true, min: 0, max: 5000 },
  active: { type: Boolean, required: true, default: true }
}, { _id: false });

const PricingRulesSchema = new Schema({
  version: { type: String, required: true, trim: true },
  currency: { type: String, required: true, trim: true, default: 'CAD' },
  crewSize: { type: Number, required: true, min: 1, max: 10 },
  hourlyRatePerMover: { type: Number, required: true, min: 0, max: 500 },
  hourlyRateTwoMoversTruck20Ft: { type: Number, required: true, min: 0, max: 2000, default: 90 },
  hourlyRateThreeMoversTruck20Ft: { type: Number, required: true, min: 0, max: 2000, default: 135 },
  hourlyCrewRates: { type: [HourlyCrewRateSchema], required: true, default: undefined },
  minimumHours: { type: Number, required: true, min: 0, max: 24 },
  transportationFee: { type: Number, required: true, min: 0, max: 2000 },
  furnitureApplianceDeliveryFee: { type: Number, required: true, min: 0, max: 2000, default: 120 },
  fixedRateFee: { type: Number, required: true, min: 0, max: 5000, default: 120 },
  stairFeePerFloor: { type: Number, required: true, min: 0, max: 500 },
  protectionMaterialsFee: { type: Number, required: true, min: 0, max: 2000 },
  packingMaterialsFee: { type: Number, required: true, min: 0, max: 2000 },
  additionalStopFee: { type: Number, required: true, min: 0, max: 2000 },
  deposit: { type: Number, required: true, min: 0, max: 5000 },
  gstRate: { type: Number, required: true, min: 0, max: 1 },
  qstRate: { type: Number, required: true, min: 0, max: 1 },
  cancellationDeadlineHours: { type: Number, required: true, min: 0, max: 720 },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'pricingrules' });

module.exports = model('PricingRules', PricingRulesSchema);
