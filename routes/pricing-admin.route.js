const { Router } = require('express');
const { check } = require('express-validator');
const { obtenerReglas, actualizarReglas } = require('../controllers/pricing.controller');
const { validarAdminKey } = require('../middlewares/validar-admin-key');
const { validarCampos } = require('../middlewares/validar-campos');

const router = Router();

router.use(validarAdminKey);

router.get('/', obtenerReglas);

router.patch('/', [
  check('currency').optional().isString().isLength({ min: 1, max: 10 }),
  check('crewSize').optional().isFloat({ min: 1, max: 10 }),
  check('hourlyRatePerMover').optional().isFloat({ min: 0, max: 500 }),
  check('hourlyRateTwoMoversTruck20Ft').optional().isFloat({ min: 0, max: 2000 }),
  check('hourlyRateThreeMoversTruck20Ft').optional().isFloat({ min: 0, max: 2000 }),
  check('hourlyCrewRates').optional().isArray({ min: 1, max: 20 }),
  check('hourlyCrewRates.*.movers').optional().isInt({ min: 1, max: 20 }),
  check('hourlyCrewRates.*.truck').optional().isString().trim().isLength({ min: 1, max: 80 }),
  check('hourlyCrewRates.*.hourlyRate').optional().isFloat({ min: 0, max: 5000 }),
  check('hourlyCrewRates.*.active').optional().isBoolean(),
  check('minimumHours').optional().isFloat({ min: 0, max: 24 }),
  check('transportationFee').optional().isFloat({ min: 0, max: 2000 }),
  check('furnitureApplianceDeliveryFee').optional().isFloat({ min: 0, max: 2000 }),
  check('fixedRateFee').optional().isFloat({ min: 0, max: 5000 }),
  check('stairFeePerFloor').optional().isFloat({ min: 0, max: 500 }),
  check('protectionMaterialsFee').optional().isFloat({ min: 0, max: 2000 }),
  check('packingMaterialsFee').optional().isFloat({ min: 0, max: 2000 }),
  check('additionalStopFee').optional().isFloat({ min: 0, max: 2000 }),
  check('deposit').optional().isFloat({ min: 0, max: 5000 }),
  check('gstRate').optional().isFloat({ min: 0, max: 1 }),
  check('qstRate').optional().isFloat({ min: 0, max: 1 }),
  check('cancellationDeadlineHours').optional().isFloat({ min: 0, max: 720 }),
  validarCampos
], actualizarReglas);

module.exports = router;
