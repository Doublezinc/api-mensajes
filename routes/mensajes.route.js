const { Router } = require("express");
const { check } = require("express-validator");
const {
    nuevoSMS,
    nuevoEmailEstimacion,
    nuevoEmailCotizacion,
    nuevaReserva
} = require("../controllers/mensaje.controller");
const { validarCampos } = require("../middlewares/validar-campos");

const router = Router();

//para enviar mensajes
router.post("/sms", nuevoSMS);

//para enviar correos
router.post("/email/cotizacion", nuevoEmailCotizacion);

//para enviar correos
router.post("/email/estimacion", nuevoEmailEstimacion);

router.post("/email/reserva", [
    check("quoteId", "Identificador de solicitud inválido").matches(/^DZ-\d{8}-[A-Z0-9]{7}$/),
    check("language", "Idioma inválido").isIn(["fr", "en", "es"]),
    check("contact.firstName", "El nombre es obligatorio").trim().notEmpty(),
    check("contact.lastName", "El apellido es obligatorio").trim().notEmpty(),
    check("contact.email", "El correo es inválido").isEmail(),
    check("contact.phone", "El teléfono es obligatorio").trim().notEmpty(),
    check("contact.moveDate", "La fecha de mudanza es inválida").isISO8601(),
    check("addresses.departure.street", "La dirección de salida es obligatoria").trim().notEmpty(),
    check("addresses.departure.city", "La ciudad de salida es obligatoria").trim().notEmpty(),
    check("addresses.destination.street", "La dirección de llegada es obligatoria").trim().notEmpty(),
    check("addresses.destination.city", "La ciudad de llegada es obligatoria").trim().notEmpty(),
    check("reservation.termsAccepted", "Debe aceptar los términos").equals("true"),
    check("reservation.acceptedAt", "La fecha de aceptación es inválida").isISO8601(),
    check("reservation.termsVersion", "La versión de términos es obligatoria").trim().notEmpty(),
    check("estimate.rulesVersion", "La versión de cálculo es obligatoria").trim().notEmpty(),
    check("estimate.totalLow", "El total mínimo es inválido").isFloat({ min: 0 }),
    check("estimate.totalHigh", "El total máximo es inválido").isFloat({ min: 0 }),
    validarCampos
], nuevaReserva);

module.exports = router;
