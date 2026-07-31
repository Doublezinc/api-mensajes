const { Router } = require("express");
const { check } = require("express-validator");
const {
    nuevoSMS,
    nuevoEmailEstimacion,
    nuevoEmailCotizacion,
    nuevoDevisRapide,
    nuevaReserva
} = require("../controllers/mensaje.controller");
const { validarCampos } = require("../middlewares/validar-campos");

const router = Router();

//para enviar mensajes
router.post("/sms", [
    check("nom", "El nombre es obligatorio").trim().notEmpty(),
    check("courriel", "El correo es inválido").isEmail(),
    check("telefono", "El teléfono es obligatorio").trim().notEmpty(),
    check("sujec", "El asunto es obligatorio").trim().notEmpty(),
    check("message", "El mensaje es obligatorio").trim().notEmpty(),
    validarCampos
], nuevoSMS);

//para enviar correos
router.post("/email/cotizacion", [
    check("nom", "El nombre es obligatorio").trim().notEmpty(),
    check("courriel", "El correo es inválido").isEmail(),
    check("telefono", "El teléfono es obligatorio").trim().notEmpty(),
    check("sujec", "El asunto es obligatorio").trim().notEmpty(),
    check("message", "El mensaje es obligatorio").trim().notEmpty(),
    validarCampos
], nuevoEmailCotizacion);

//para enviar correos
router.post("/email/estimacion", [
    check("date", "La fecha es obligatoria").trim().notEmpty(),
    check("name", "El nombre es obligatorio").trim().notEmpty(),
    check("tel", "El teléfono es obligatorio").trim().notEmpty(),
    check("email", "El correo es inválido").isEmail(),
    check("street", "La dirección de salida es obligatoria").trim().notEmpty(),
    check("city", "La ciudad de salida es obligatoria").trim().notEmpty(),
    check("postalCode", "El código postal de salida es obligatorio").trim().notEmpty(),
    check("streetNumber", "La dirección de llegada es obligatoria").trim().notEmpty(),
    check("would", "La ciudad de llegada es obligatoria").trim().notEmpty(),
    check("codePostal", "El código postal de llegada es obligatorio").trim().notEmpty(),
    validarCampos
], nuevoEmailEstimacion);

router.post("/email/devis-rapide", [
    check("origin", "La direccion de salida es obligatoria").trim().notEmpty(),
    check("destination", "La direccion de llegada es obligatoria").trim().notEmpty(),
    check("housing", "El tipo de vivienda es obligatorio").trim().notEmpty(),
    check("rooms", "El numero de piezas es obligatorio").trim().notEmpty(),
    check("access", "El acceso es obligatorio").trim().notEmpty(),
    check("date", "La fecha es invalida").optional({ checkFalsy: true }).isISO8601(),
    check("phone", "El telefono es obligatorio").trim().notEmpty(),
    check("estimate", "La estimacion es obligatoria").trim().notEmpty(),
    validarCampos
], nuevoDevisRapide);

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
