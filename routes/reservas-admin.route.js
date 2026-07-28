const { Router } = require('express');
const { check, param } = require('express-validator');
const {
  listarReservas,
  obtenerReserva,
  actualizarEstado,
  registrarDeposito
} = require('../controllers/reservas-admin.controller');
const { validarAdminKey } = require('../middlewares/validar-admin-key');
const { validarCampos } = require('../middlewares/validar-campos');

const router = Router();

router.use(validarAdminKey);

router.get('/', listarReservas);

router.get('/:quoteId', [
  param('quoteId', 'Identificador inválido').matches(/^DZ-\d{8}-[A-Z0-9]{7}$/),
  validarCampos
], obtenerReserva);

router.patch('/:quoteId/status', [
  param('quoteId', 'Identificador inválido').matches(/^DZ-\d{8}-[A-Z0-9]{7}$/),
  check('status', 'Estado inválido').isIn([
    'request_received',
    'awaiting_deposit',
    'deposit_received',
    'confirmed',
    'completed',
    'cancelled'
  ]),
  check('notes', 'Las notas no pueden superar 1000 caracteres').optional().isString().isLength({ max: 1000 }),
  validarCampos
], actualizarEstado);

router.patch('/:quoteId/deposito', [
  param('quoteId', 'Identificador inválido').matches(/^DZ-\d{8}-[A-Z0-9]{7}$/),
  check('received', 'El estado del depósito es obligatorio').isBoolean(),
  check('reference', 'La referencia no puede superar 200 caracteres')
    .optional()
    .isString()
    .isLength({ max: 200 }),
  validarCampos
], registrarDeposito);

module.exports = router;
