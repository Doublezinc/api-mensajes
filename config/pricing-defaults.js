module.exports = {
  version: 'mvp-2026-01',
  currency: 'CAD',
  crewSize: 3,
  hourlyRatePerMover: 45,
  hourlyRateTwoMoversTruck20Ft: 90,
  hourlyRateThreeMoversTruck20Ft: 135,
  hourlyCrewRates: [
    { movers: 2, truck: '20 pies', hourlyRate: 90, active: true },
    { movers: 3, truck: '20 pies', hourlyRate: 135, active: true }
  ],
  minimumHours: 3.5,
  transportationFee: 120,
  furnitureApplianceDeliveryFee: 120,
  fixedRateFee: 120,
  stairFeePerFloor: 40,
  protectionMaterialsFee: 45,
  packingMaterialsFee: 65,
  additionalStopFee: 55,
  deposit: 150,
  gstRate: 0.05,
  qstRate: 0.09975,
  cancellationDeadlineHours: 48
};
