const { Router } = require('express');
const { check } = require('express-validator');
const {
  obtenerDisponibilidad,
  crearPetitTransport
} = require('../controllers/petits-transports.controller');
const { validarCampos } = require('../middlewares/validar-campos');

const router = Router();

router.get('/disponibilites', obtenerDisponibilidad);

router.post('/', [
  check('date', 'La fecha es inválida').matches(/^\d{4}-\d{2}-\d{2}$/),
  check('slot', 'La hora es inválida').matches(/^\d{2}:\d{2}$/),
  check('items', 'Cantidad de artículos inválida').isInt({ min: 1, max: 3 }),
  check('itemsDescription', 'Describa los artículos').isString().trim().notEmpty().isLength({ max: 500 }),
  check('contact.name', 'El nombre es obligatorio').isString().trim().notEmpty().isLength({ max: 120 }),
  check('contact.phone', 'El teléfono es obligatorio').isString().trim().notEmpty().isLength({ max: 30 }),
  check('contact.email', 'El correo es inválido').optional({ checkFalsy: true }).isEmail(),
  check('addresses.pickup.street', 'La dirección de salida es obligatoria').isString().trim().notEmpty().isLength({ max: 200 }),
  check('addresses.pickup.city', 'La ciudad de salida es obligatoria').isString().trim().notEmpty().isLength({ max: 100 }),
  check('addresses.delivery.street', 'La dirección de entrega es obligatoria').isString().trim().notEmpty().isLength({ max: 200 }),
  check('addresses.delivery.city', 'La ciudad de entrega es obligatoria').isString().trim().notEmpty().isLength({ max: 100 }),
  check('addresses.*.floor').optional().isString().isLength({ max: 20 }),
  check('addresses.*.elevator').optional().isBoolean(),
  check('notes').optional().isString().isLength({ max: 1000 }),
  check('language').optional().isIn(['fr', 'en', 'es']),
  check('serviceAreaAccepted', 'Debe aceptar las condiciones de zona').equals('true'),
  validarCampos
], crearPetitTransport);

module.exports = router;
