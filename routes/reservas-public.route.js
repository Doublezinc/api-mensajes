const { Router } = require('express');
const { param } = require('express-validator');
const { descargarContrato } = require('../controllers/reservas-public.controller');
const { validarCampos } = require('../middlewares/validar-campos');

const router = Router();

router.get('/:quoteId/contrato', [
  param('quoteId', 'Identificador inválido').matches(/^DZ-\d{8}-[A-Z0-9]{7}$/),
  validarCampos
], descargarContrato);

module.exports = router;
