// Soumission web : le client remplit le formulaire du site, voit son estimation
// au format « Soumission de déménagement » et reçoit sa copie en PDF par courriel.
// Une copie part aussi à Groupe Double Z.
const { Router } = require('express');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const postmarkTransport = require('nodemailer-postmark-transport');
const { validarCampos } = require('../middlewares/validar-campos');
const { escapeHtml } = require('../utils/escapeHtml');

const router = Router();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas solicitudes. Intente de nuevo más tarde.' }
}));

// Même logique que helpers/createEmail.js : SMTP Hostinger, Postmark en secours
const crearTransportePostmark = () => nodemailer.createTransport(
  postmarkTransport({ auth: { apiKey: process.env.POSTMARKKEY } })
);
const crearTransporte = () => {
  if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    return crearTransportePostmark();
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS },
    connectionTimeout: 15000
  });
  return {
    sendMail: async (mensaje) => {
      try {
        return await smtp.sendMail(mensaje);
      } catch (error) {
        console.error('SMTP Hostinger falló, se usa Postmark:', error && error.message);
        return crearTransportePostmark().sendMail(mensaje);
      }
    }
  };
};

const TXT = {
  fr: {
    subject: (no) => `Votre soumission de déménagement No. ${no} – Groupe Double Z`,
    hi: (n) => `Bonjour${n ? ' ' + n : ''},`,
    body: (no) => `Merci d'avoir choisi Groupe Double Z ! Vous trouverez ci-joint votre soumission de déménagement <b>No. ${no}</b>.`,
    total: 'Estimation',
    deposit: 'Dépôt pour réserver la date',
    next: 'Notre équipe vous contacte très bientôt pour confirmer les détails et réserver votre date. Pressé ? Appelez-nous au <b>514-234-9971</b>.',
    regards: 'Merci de votre confiance,'
  },
  en: {
    subject: (no) => `Your moving quote No. ${no} – Groupe Double Z`,
    hi: (n) => `Hello${n ? ' ' + n : ''},`,
    body: (no) => `Thank you for choosing Groupe Double Z! Please find attached your moving quote <b>No. ${no}</b>.`,
    total: 'Estimate',
    deposit: 'Deposit to book the date',
    next: 'Our team will contact you very soon to confirm the details and book your date. In a hurry? Call us at <b>514-234-9971</b>.',
    regards: 'Thank you for your trust,'
  },
  es: {
    subject: (no) => `Su cotización de mudanza N.º ${no} – Groupe Double Z`,
    hi: (n) => `Hola${n ? ' ' + n : ''},`,
    body: (no) => `¡Gracias por elegir Groupe Double Z! Adjuntamos su cotización de mudanza <b>N.º ${no}</b>.`,
    total: 'Estimación',
    deposit: 'Depósito para reservar la fecha',
    next: 'Nuestro equipo le contactará muy pronto para confirmar los detalles y reservar su fecha. ¿Tiene prisa? Llámenos al <b>514-234-9971</b>.',
    regards: 'Gracias por su confianza,'
  }
};

const marco = (contenido) => `
  <div style="background:#f4f4f5;padding:24px 10px;font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee">
      <div style="background:#111;border-bottom:4px solid #D7141A;padding:16px 22px">
        <img src="https://www.transportdoublez.com/images/logo.jpeg" alt="Groupe Double Z" width="64" height="64" style="border-radius:8px;background:#fff;vertical-align:middle">
        <span style="color:#fff;font-weight:900;font-size:18px;margin-left:12px;vertical-align:middle">GROUPE DOUBLE Z</span>
      </div>
      <div style="padding:22px 24px;font-size:15px;line-height:1.55">${contenido}</div>
      <div style="background:#111;color:#bbb;font-size:12px;text-align:center;padding:12px">
        Groupe Double Z Inc · 514-234-9971 · demenagement@transportdoublez.com · www.transportdoublez.com
      </div>
    </div>
  </div>`;

router.post('/', [
  check('quoteNo', 'Numéro invalide').trim().matches(/^DZ-W\d{6}-\d{4}$/),
  check('lang').optional().isIn(['fr', 'en', 'es']),
  check('name', 'Nom obligatoire').trim().notEmpty().isLength({ max: 120 }),
  check('phone', 'Téléphone obligatoire').trim().notEmpty().isLength({ max: 40 }),
  check('email').optional({ checkFalsy: true }).isEmail(),
  check('pdf', 'PDF invalide').isString().isLength({ min: 1000, max: 6 * 1024 * 1024 }),
  validarCampos
], async (req, res) => {
  try {
    const lang = TXT[req.body.lang] ? req.body.lang : 'fr';
    const t = TXT[lang];
    const no = req.body.quoteNo;
    const name = String(req.body.name).trim();
    const firstName = name.split(/\s+/)[0] || '';
    const email = String(req.body.email || '').trim();
    const pdfB64 = String(req.body.pdf).replace(/^data:application\/pdf;[^,]*,/, '');
    const pdf = Buffer.from(pdfB64, 'base64');
    if (pdf.subarray(0, 4).toString() !== '%PDF') {
      return res.status(400).json({ ok: false, message: 'PDF invalide' });
    }
    const filename = `${lang === 'en' ? 'Quote' : lang === 'es' ? 'Cotizacion' : 'Soumission'}_${no}.pdf`;
    const attachments = [{ filename, content: pdf, contentType: 'application/pdf' }];
    const transport = crearTransporte();
    const from = 'demenagement@transportdoublez.com';
    const estimate = escapeHtml(String(req.body.estimate || '').slice(0, 200));
    const deposit = escapeHtml(String(req.body.deposit || '').slice(0, 60));

    const envios = [transport.sendMail({
      from,
      to: process.env.RESERVATION_EMAIL || from,
      replyTo: email || undefined,
      subject: `🧾 Soumission web ${no} — ${name} — ${req.body.phone}`,
      text: `Soumission web ${no} : ${name} · ${req.body.phone} · ${email || 'sans courriel'} · ${req.body.estimate || ''}`,
      html: marco(`
        <h2 style="margin:0 0 10px;color:#D7141A">Nouvelle soumission web ${escapeHtml(no)}</h2>
        <p style="margin:0 0 6px"><b>Client :</b> ${escapeHtml(name)}</p>
        <p style="margin:0 0 6px"><b>Téléphone :</b> ${escapeHtml(req.body.phone)}</p>
        <p style="margin:0 0 6px"><b>Courriel :</b> ${escapeHtml(email || '—')}</p>
        <p style="margin:0 0 6px"><b>Estimation :</b> ${estimate || '—'}</p>
        <p style="margin:0 0 14px"><b>Dépôt :</b> ${deposit || '—'}</p>
        <p style="margin:0;color:#555">${email ? 'Le client a reçu sa copie par courriel.' : 'Le client n’a pas donné de courriel : il a pu télécharger sa copie sur le site.'} La soumission complète est en pièce jointe.</p>`),
      attachments
    })];

    if (email) {
      envios.push(transport.sendMail({
        from,
        to: email,
        replyTo: from,
        subject: t.subject(no),
        text: `${t.hi(firstName)} ${t.subject(no)}. 514-234-9971`,
        html: marco(`
          <p style="margin:0 0 12px">${escapeHtml(t.hi(firstName))}</p>
          <p style="margin:0 0 14px">${t.body(escapeHtml(no))}</p>
          ${estimate ? `<p style="margin:0 0 6px"><b>${t.total} :</b> ${estimate}</p>` : ''}
          ${deposit ? `<p style="margin:0 0 14px"><b>${t.deposit} :</b> ${deposit}</p>` : ''}
          <p style="margin:0 0 16px">${t.next}</p>
          <p style="margin:0">${t.regards}<br><b>Groupe Double Z</b><br><i style="color:#D7141A">Déménagement Unique et Efficace</i></p>`),
        attachments
      }));
    }

    const resultados = await Promise.allSettled(envios);
    resultados.forEach((r) => { if (r.status === 'rejected') console.error('Soumission web, envoi échoué:', r.reason && r.reason.message); });
    const clientOk = email ? resultados[1].status === 'fulfilled' : false;
    return res.status(200).json({ ok: resultados[0].status === 'fulfilled' || clientOk, clientEmailSent: clientOk });
  } catch (error) {
    console.error('Error soumission web:', error);
    return res.status(500).json({ ok: false, message: 'Erreur lors de l’envoi' });
  }
});

module.exports = router;
