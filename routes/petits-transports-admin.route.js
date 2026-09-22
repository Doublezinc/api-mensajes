const { Router } = require('express');
const { check, param, query } = require('express-validator');
const {
  listarPetitsTransports,
  actualizarEstadoPetitTransport
} = require('../controllers/petits-transports.controller');
const { validarAdminKey } = require('../middlewares/validar-admin-key');
const { validarCampos } = require('../middlewares/validar-campos');

const router = Router();

router.use(validarAdminKey);

router.get('/', [
  query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']),
  validarCampos
], listarPetitsTransports);

router.patch('/:bookingId/status', [
  param('bookingId', 'Identificador inválido').matches(/^PT-\d{8}-[A-Z0-9]{7}$/),
  check('status', 'Estado inválido').isIn(['pending', 'confirmed', 'completed', 'cancelled']),
  check('notes', 'Las notas no pueden superar 1000 caracteres').optional().isString().isLength({ max: 1000 }),
  validarCampos
], actualizarEstadoPetitTransport);

module.exports = router;
