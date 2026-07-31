const { Router } = require('express');
const { obtenerReglas } = require('../controllers/pricing.controller');

const router = Router();

router.get('/', obtenerReglas);

module.exports = router;
