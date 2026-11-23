// Agenda (registre des services confirmés) – accès réservé : en-tête x-admin-key
const { Router } = require('express');
const { check, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validarAdminKey } = require('../middlewares/validar-admin-key');
const { validarCampos } = require('../middlewares/validar-campos');
const { databaseIsReady } = require('../config/database');
const { Agenda } = require('../models/agenda.modelo');
const PetitTransport = require('../models/petit-transport.modelo');
const Reserva = require('../models/reserva.modelo');
const {
  startAgendaScheduler, sendClientEmail, sendClientSms, sendDigest, smsStatus, nowParts, addDays
} = require('../utils/agendaReminders');

const router = Router();
// Express 4 ne capture pas les erreurs des fonctions async : on les relaie au gestionnaire d'erreurs
['get', 'post', 'patch', 'delete'].forEach((m) => {
  const orig = router[m].bind(router);
  router[m] = (path, ...handlers) => orig(path, ...handlers.flat().map((h) => (
    typeof h === 'function' && h.constructor.name === 'AsyncFunction'
      ? (req, res, next) => h(req, res, next).catch(next)
      : h)));
});
startAgendaScheduler();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas solicitudes. Intente de nuevo más tarde.' }
}));
router.use(validarAdminKey);
router.use((req, res, next) => (databaseIsReady()
  ? next()
  : res.status(503).json({ ok: false, message: 'Base de données indisponible' })));

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIELDS = ['clientName', 'phone', 'email', 'language', 'serviceType', 'date', 'time', 'departure', 'destination',
  'crew', 'vehicle', 'estimate', 'total', 'deposit', 'depositPaid', 'notes', 'status', 'remindersEnabled', 'source', 'sourceRef'];
const pick = (body) => FIELDS.reduce((o, k) => { if (body[k] !== undefined) o[k] = body[k]; return o; }, {});

const validators = (optional) => {
  const o = (c) => (optional ? c.optional() : c);
  return [
    o(check('clientName', 'Nom du client obligatoire').isString().trim().notEmpty().isLength({ max: 120 })),
    o(check('date', 'Date invalide').matches(DATE)),
    check('time', 'Heure invalide').optional({ checkFalsy: true }).matches(/^\d{2}:\d{2}$/),
    check('email', 'Courriel invalide').optional({ checkFalsy: true }).isEmail(),
    check('phone').optional().isString().isLength({ max: 40 }),
    check('language').optional().isIn(['fr', 'en', 'es']),
    check('serviceType').optional().isIn(['demenagement', 'petit_transport', 'livraison', 'autre']),
    check('status').optional().isIn(['confirmed', 'completed', 'cancelled']),
    check(['total', 'deposit']).optional().isFloat({ min: 0, max: 100000 }),
    check('crew').optional().isInt({ min: 1, max: 10 }),
    check(['depositPaid', 'remindersEnabled']).optional().isBoolean(),
    check(['departure', 'destination']).optional().isString().isLength({ max: 300 }),
    check('notes').optional().isString().isLength({ max: 2000 }),
    validarCampos
  ];
};

// Liste (par défaut : 30 jours passés à 120 jours à venir)
router.get('/', [
  query(['from', 'to']).optional().matches(DATE),
  validarCampos
], async (req, res) => {
  const { date: today } = nowParts();
  const from = req.query.from || addDays(today, -30);
  const to = req.query.to || addDays(today, 120);
  const items = await Agenda.find({ date: { $gte: from, $lte: to } }).sort({ date: 1, time: 1 }).limit(1000);
  res.json({ ok: true, today, from, to, items });
});

router.post('/', validators(false), async (req, res) => {
  const item = await Agenda.create(pick(req.body));
  res.status(201).json({ ok: true, item });
});

router.patch('/:id', [param('id').isMongoId(), ...validators(true)], async (req, res) => {
  const item = await Agenda.findById(req.params.id);
  if (!item) return res.status(404).json({ ok: false, message: 'Introuvable' });
  const changes = pick(req.body);
  // Si la date ou l'heure change, les rappels repartent à zéro
  if ((changes.date && changes.date !== item.date) || (changes.time && changes.time !== item.time)) {
    item.reminders = { email2: null, email1: null, sms1: null, lastError: '' };
  }
  Object.assign(item, changes);
  await item.save();
  res.json({ ok: true, item });
});

router.delete('/:id', [param('id').isMongoId(), validarCampos], async (req, res) => {
  const r = await Agenda.deleteOne({ _id: req.params.id });
  res.json({ ok: r.deletedCount === 1 });
});

// Envoi manuel d'un rappel au client (courriel ou SMS)
router.post('/:id/rappel', [
  param('id').isMongoId(),
  check('channel').isIn(['email', 'sms']),
  validarCampos
], async (req, res) => {
  const item = await Agenda.findById(req.params.id);
  if (!item) return res.status(404).json({ ok: false, message: 'Introuvable' });
  try {
    if (req.body.channel === 'email') { await sendClientEmail(item, 1); item.reminders.email1 = new Date(); }
    else { await sendClientSms(item); item.reminders.sms1 = new Date(); }
    item.reminders.lastError = '';
    await item.save();
    res.json({ ok: true, item });
  } catch (e) {
    item.reminders.lastError = `Envoi manuel ${req.body.channel} : ${e.message}`;
    await item.save();
    res.status(502).json({ ok: false, message: e.message, item });
  }
});

// Résumé du lendemain envoyé tout de suite à l'entreprise
router.post('/resume', async (req, res) => {
  const { date: today } = nowParts();
  const n = await sendDigest(addDays(today, 1));
  res.json({ ok: true, services: n });
});

// État des envois (sans rien envoyer)
router.get('/etat', async (req, res) => {
  res.json({ ok: true, sms: await smsStatus(), email: Boolean(process.env.SMTP_HOST || process.env.POSTMARKKEY) });
});

// Demandes reçues en ligne (petits transports + réservations), pour les ajouter à l'agenda
router.get('/demandes', async (req, res) => {
  const { date: today } = nowParts();
  const already = new Set((await Agenda.find({ sourceRef: { $ne: '' } }, { sourceRef: 1 }).lean()).map((x) => x.sourceRef));
  const pts = await PetitTransport.find({ date: { $gte: today }, status: { $in: ['pending', 'confirmed'] } }).sort({ date: 1 }).limit(100).lean();
  const res2 = await Reserva.find({ 'contact.moveDate': { $gte: today }, status: { $nin: ['cancelled', 'completed'] } }).sort({ 'contact.moveDate': 1 }).limit(100).lean();
  const addr = (a) => (a ? [a.street, a.city].filter(Boolean).join(', ') : '');
  const out = [
    ...pts.map((p) => ({
      sourceRef: `PT:${p.bookingId}`,
      source: 'petit_transport_web',
      clientName: p.contact && p.contact.name, phone: p.contact && p.contact.phone, email: (p.contact && p.contact.email) || '',
      language: p.language || 'fr', serviceType: 'petit_transport', date: p.date, time: p.slot,
      departure: addr(p.addresses && p.addresses.pickup), destination: addr(p.addresses && p.addresses.delivery),
      crew: 2, vehicle: 'Sprinter', total: p.price || 0, estimate: `${p.items} article(s)`, notes: p.itemsDescription || '', status: p.status
    })),
    ...res2.map((r) => ({
      sourceRef: `RS:${r.quoteId}`,
      source: 'reservation_web',
      clientName: [r.contact.firstName, r.contact.lastName].filter(Boolean).join(' '), phone: r.contact.phone, email: r.contact.email || '',
      language: r.language || 'fr', serviceType: 'demenagement', date: r.contact.moveDate, time: '08:00',
      departure: addr(r.addresses && r.addresses.departure), destination: addr(r.addresses && r.addresses.destination),
      crew: 2, vehicle: 'Camion 20 pieds', total: 0, estimate: '', notes: '', status: r.status
    }))
  ].filter((x) => !already.has(x.sourceRef));
  res.json({ ok: true, items: out });
});

// Erreurs : réponse JSON propre
router.use((err, req, res, next) => {
  console.error('Agenda :', err && err.message);
  res.status(500).json({ ok: false, message: 'Erreur serveur' });
});

module.exports = router;
