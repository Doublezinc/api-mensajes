// Rappels automatiques de l'agenda Groupe Double Z
// - Client : courriel 2 jours avant, courriel + SMS la veille (entre 10 h et 21 h, heure de Montréal)
// - Entreprise : résumé chaque soir (après 19 h) des services du lendemain
const nodemailer = require('nodemailer');
const postmarkTransport = require('nodemailer-postmark-transport');
const twilio = require('twilio');
const { Agenda, AgendaMeta } = require('../models/agenda.modelo');
const { databaseIsReady } = require('../config/database');
const { escapeHtml } = require('./escapeHtml');

const TZ = 'America/Montreal';
const FROM = 'demenagement@transportdoublez.com';
const COMPANY_EMAIL = () => process.env.RESERVATION_EMAIL || FROM;
const TWILIO_FROM = () => process.env.TWILIO_FROM || '+13612395600';
const CHECK_EVERY_MS = 10 * 60 * 1000;

/* ---------- Dates (heure de Montréal) ---------- */
const nowParts = (now = new Date()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
};
const addDays = (iso, days) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const LOCALES = { fr: 'fr-CA', en: 'en-CA', es: 'es-ES' };
const fmtDate = (iso, lang = 'fr') => new Intl.DateTimeFormat(LOCALES[lang] || 'fr-CA', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
}).format(new Date(`${iso}T12:00:00Z`));
const fmtTime = (hhmm, lang = 'fr') => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':');
  if (lang === 'en') return `${Number(h) % 12 || 12}:${m} ${Number(h) < 12 ? 'AM' : 'PM'}`;
  if (lang === 'es') return `${Number(h)}:${m}`;
  return `${Number(h)} h ${m}`;
};
const money = (n) => `${(Math.round((n || 0) * 100) / 100).toFixed(2).replace('.', ',')} $`;

/* ---------- Envoi ---------- */
const postmark = () => nodemailer.createTransport(postmarkTransport({ auth: { apiKey: process.env.POSTMARKKEY } }));
const mailer = () => {
  if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) return postmark();
  const port = Number(process.env.SMTP_PORT || 465);
  const smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS }, connectionTimeout: 15000
  });
  return {
    sendMail: async (msg) => {
      try { return await smtp.sendMail(msg); } catch (e) {
        console.error('Agenda : SMTP Hostinger a échoué, Postmark utilisé :', e && e.message);
        return postmark().sendMail(msg);
      }
    }
  };
};
const twilioClient = () => {
  if (!(process.env.TWILIOACCOUNDSID && process.env.TWILIOTOKEN)) return null;
  return twilio(process.env.TWILIOACCOUNDSID, process.env.TWILIOTOKEN);
};
const normalizePhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return null;
};

/* ---------- Gabarits ---------- */
const frame = (inner) => `
  <div style="background:#f4f4f5;padding:24px 10px;font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee">
      <div style="background:#111;border-bottom:4px solid #D7141A;padding:16px 22px">
        <img src="https://www.transportdoublez.com/images/logo.jpeg" alt="Groupe Double Z" width="64" height="64" style="border-radius:8px;background:#fff;vertical-align:middle">
        <span style="color:#fff;font-weight:900;font-size:18px;margin-left:12px;vertical-align:middle">GROUPE DOUBLE Z</span>
      </div>
      <div style="padding:22px 24px;font-size:15px;line-height:1.55">${inner}</div>
      <div style="background:#111;color:#bbb;font-size:12px;text-align:center;padding:12px">
        Groupe Double Z Inc · 514-234-9971 · demenagement@transportdoublez.com · www.transportdoublez.com
      </div>
    </div>
  </div>`;

const SERVICE = {
  fr: { demenagement: 'déménagement', petit_transport: 'petit transport', livraison: 'livraison', autre: 'service' },
  en: { demenagement: 'move', petit_transport: 'small move', livraison: 'delivery', autre: 'service' },
  es: { demenagement: 'mudanza', petit_transport: 'pequeño transporte', livraison: 'entrega', autre: 'servicio' }
};
const T = {
  fr: {
    subj2: (s, d) => `Rappel : votre ${s} du ${d} – Groupe Double Z`,
    subj1: (s) => `Demain : votre ${s} avec Groupe Double Z`,
    hi: (n) => `Bonjour ${n},`,
    intro2: (s, d, h) => `Petit rappel : votre ${s} avec Groupe Double Z est prévu le <b>${d}</b>${h ? ` à <b>${h}</b>` : ''}.`,
    intro1: (s, d, h) => `C'est demain ! Votre ${s} est prévu le <b>${d}</b>${h ? `, arrivée de l'équipe vers <b>${h}</b>` : ''}.`,
    from: 'Départ', to: 'Arrivée', balance: 'Solde à payer le jour du service',
    tips: ['Boîtes fermées et identifiées', 'Accès et stationnement libres pour le camion', 'Objets fragiles ou de valeur mis de côté'],
    tipsTitle: 'Pour que tout se passe bien :',
    change: 'Un changement ? Appelez-nous au <b>514-234-9971</b>.',
    bye: 'À bientôt,',
    sms: (s, d, h) => `Groupe Double Z : rappel de votre ${s} demain ${d}${h ? ` a ${h}` : ''}. Questions : 514-234-9971`
  },
  en: {
    subj2: (s, d) => `Reminder: your ${s} on ${d} – Groupe Double Z`,
    subj1: (s) => `Tomorrow: your ${s} with Groupe Double Z`,
    hi: (n) => `Hello ${n},`,
    intro2: (s, d, h) => `Friendly reminder: your ${s} with Groupe Double Z is scheduled for <b>${d}</b>${h ? ` at <b>${h}</b>` : ''}.`,
    intro1: (s, d, h) => `It's tomorrow! Your ${s} is scheduled for <b>${d}</b>${h ? `, team arrival around <b>${h}</b>` : ''}.`,
    from: 'From', to: 'To', balance: 'Balance due on the day of service',
    tips: ['Boxes closed and labelled', 'Access and parking clear for the truck', 'Fragile or valuable items set aside'],
    tipsTitle: 'To make everything go smoothly:',
    change: 'Any change? Call us at <b>514-234-9971</b>.',
    bye: 'See you soon,',
    sms: (s, d, h) => `Groupe Double Z: reminder of your ${s} tomorrow ${d}${h ? ` at ${h}` : ''}. Questions: 514-234-9971`
  },
  es: {
    subj2: (s, d) => `Recordatorio: su ${s} del ${d} – Groupe Double Z`,
    subj1: (s) => `Mañana: su ${s} con Groupe Double Z`,
    hi: (n) => `Hola ${n}:`,
    intro2: (s, d, h) => `Le recordamos que su ${s} con Groupe Double Z está prevista para el <b>${d}</b>${h ? ` a las <b>${h}</b>` : ''}.`,
    intro1: (s, d, h) => `¡Es mañana! Su ${s} está prevista para el <b>${d}</b>${h ? `; el equipo llega hacia las <b>${h}</b>` : ''}.`,
    from: 'Salida', to: 'Llegada', balance: 'Saldo a pagar el día del servicio',
    tips: ['Cajas cerradas y marcadas', 'Acceso y estacionamiento libres para el camión', 'Objetos frágiles o de valor apartados'],
    tipsTitle: 'Para que todo salga bien:',
    change: '¿Algún cambio? Llámenos al <b>514-234-9971</b>.',
    bye: 'Hasta pronto,',
    sms: (s, d, h) => `Groupe Double Z: recordatorio de su ${s} manana ${d}${h ? ` a las ${h}` : ''}. Preguntas: 514-234-9971`
  }
};
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const balanceOf = (it) => Math.max(0, (it.total || 0) - (it.depositPaid ? (it.deposit || 0) : 0));

const clientEmail = (it, kind) => {
  const lang = T[it.language] ? it.language : 'fr';
  const t = T[lang];
  const s = SERVICE[lang][it.serviceType] || SERVICE[lang].autre;
  const d = fmtDate(it.date, lang);
  const h = fmtTime(it.time, lang);
  const bal = balanceOf(it);
  const rows = [
    it.departure ? `<p style="margin:0 0 4px"><b>${t.from} :</b> ${escapeHtml(it.departure)}</p>` : '',
    it.destination ? `<p style="margin:0 0 4px"><b>${t.to} :</b> ${escapeHtml(it.destination)}</p>` : '',
    bal > 0 ? `<p style="margin:0 0 4px"><b>${t.balance} :</b> ${money(bal)}</p>` : ''
  ].join('');
  const html = frame(`
    <p style="margin:0 0 12px">${escapeHtml(t.hi(firstName(it.clientName)))}</p>
    <p style="margin:0 0 14px">${kind === 1 ? t.intro1(s, d, h) : t.intro2(s, d, h)}</p>
    ${rows ? `<div style="background:#fdf1f1;border-radius:10px;padding:12px 14px;margin:0 0 14px">${rows}</div>` : ''}
    ${kind === 1 ? `<p style="margin:0 0 6px"><b>${t.tipsTitle}</b></p><ul style="margin:0 0 14px;padding-left:20px">${t.tips.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
    <p style="margin:0 0 16px">${t.change}</p>
    <p style="margin:0">${t.bye}<br><b>Groupe Double Z</b><br><i style="color:#D7141A">Déménagement Unique et Efficace</i></p>`);
  return { subject: kind === 1 ? t.subj1(s) : t.subj2(s, d), html, text: `${t.hi(firstName(it.clientName))} ${kind === 1 ? t.subj1(s) : t.subj2(s, d)} – 514-234-9971` };
};
const clientSms = (it) => {
  const lang = T[it.language] ? it.language : 'fr';
  const s = SERVICE[lang][it.serviceType] || SERVICE[lang].autre;
  const d = fmtDate(it.date, lang).normalize('NFD').replace(/[̀-ͯ]/g, '');
  return T[lang].sms(s, d, fmtTime(it.time, lang)).normalize('NFD').replace(/[̀-ͯ]/g, '');
};

/* ---------- Actions unitaires ---------- */
const sendClientEmail = async (it, kind) => {
  if (!it.email) throw new Error('Pas de courriel client');
  const m = clientEmail(it, kind);
  await mailer().sendMail({ from: FROM, to: it.email, replyTo: FROM, subject: m.subject, html: m.html, text: m.text });
};
const sendClientSms = async (it) => {
  const client = twilioClient();
  if (!client) throw new Error('SMS non configuré');
  const to = normalizePhone(it.phone);
  if (!to) throw new Error('Téléphone invalide');
  await client.messages.create({ body: clientSms(it), to, from: TWILIO_FROM() });
};

const digestHtml = (date, items, upcoming) => {
  const row = (it) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap"><b>${escapeHtml(it.time || '')}</b></td>
      <td style="padding:8px;border-bottom:1px solid #eee">
        <b>${escapeHtml(it.clientName)}</b> · ${escapeHtml(it.phone || '')}<br>
        ${escapeHtml(it.departure || '—')} → ${escapeHtml(it.destination || '—')}<br>
        <span style="color:#555">${escapeHtml(SERVICE.fr[it.serviceType] || '')} · ${it.crew || 2} déménageurs${it.vehicle ? ` · ${escapeHtml(it.vehicle)}` : ''}</span>
        ${it.notes ? `<br><span style="color:#555">${escapeHtml(it.notes)}</span>` : ''}
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${balanceOf(it) > 0 ? `<b style="color:#D7141A">${money(balanceOf(it))}</b><br><span style="color:#777;font-size:12px">à encaisser</span>` : '<span style="color:#1f9d55">Payé</span>'}</td>
    </tr>`;
  return frame(`
    <h2 style="margin:0 0 4px;color:#D7141A">Demain : ${escapeHtml(fmtDate(date))}</h2>
    <p style="margin:0 0 14px;color:#555">${items.length} service${items.length > 1 ? 's' : ''} prévu${items.length > 1 ? 's' : ''}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${items.map(row).join('')}</table>
    ${upcoming.length ? `<p style="margin:18px 0 6px"><b>Les 7 prochains jours :</b></p><ul style="margin:0;padding-left:20px;color:#333">${upcoming.map((it) => `<li>${escapeHtml(fmtDate(it.date))} ${escapeHtml(it.time || '')} – ${escapeHtml(it.clientName)}</li>`).join('')}</ul>` : ''}
    <p style="margin:18px 0 0"><a href="https://www.transportdoublez.com/agenda.html" style="color:#D7141A;font-weight:bold">Ouvrir l'agenda</a></p>`);
};
const sendDigest = async (date) => {
  const items = await Agenda.find({ date, status: 'confirmed' }).sort({ time: 1 });
  if (!items.length) return 0;
  const upcoming = await Agenda.find({ date: { $gt: date, $lte: addDays(date, 7) }, status: 'confirmed' }).sort({ date: 1, time: 1 });
  await mailer().sendMail({
    from: FROM,
    to: COMPANY_EMAIL(),
    subject: `📅 Demain (${fmtDate(date)}) : ${items.length} service${items.length > 1 ? 's' : ''} – Groupe Double Z`,
    html: digestHtml(date, items, upcoming),
    text: items.map((it) => `${it.time} ${it.clientName} ${it.phone} ${it.departure} -> ${it.destination}`).join('\n')
  });
  return items.length;
};

/* ---------- Tâche périodique ---------- */
let running = false;
const tick = async () => {
  if (running || !databaseIsReady()) return;
  running = true;
  try {
    const { date: today, hour } = nowParts();
    if (hour >= 10 && hour < 21) {
      const j2 = await Agenda.find({ date: addDays(today, 2), status: 'confirmed', remindersEnabled: true, email: { $ne: '' }, 'reminders.email2': null });
      for (const it of j2) {
        try { await sendClientEmail(it, 2); it.reminders.email2 = new Date(); } catch (e) { it.reminders.lastError = `J-2 courriel : ${e.message}`; }
        await it.save();
      }
      const j1 = await Agenda.find({ date: addDays(today, 1), status: 'confirmed', remindersEnabled: true });
      for (const it of j1) {
        if (it.email && !it.reminders.email1) {
          try { await sendClientEmail(it, 1); it.reminders.email1 = new Date(); } catch (e) { it.reminders.lastError = `J-1 courriel : ${e.message}`; }
        }
        if (it.phone && !it.reminders.sms1 && twilioClient()) {
          try { await sendClientSms(it); it.reminders.sms1 = new Date(); } catch (e) { it.reminders.lastError = `J-1 SMS : ${e.message}`; }
        }
        await it.save();
      }
    }
    if (hour >= 19) {
      const meta = await AgendaMeta.findOne({ key: 'lastDigest' });
      if (!meta || meta.value !== today) {
        try { await sendDigest(addDays(today, 1)); } catch (e) { console.error('Agenda : résumé non envoyé :', e.message); }
        await AgendaMeta.updateOne({ key: 'lastDigest' }, { $set: { value: today } }, { upsert: true });
      }
    }
  } catch (e) {
    console.error('Agenda : erreur des rappels :', e && e.message);
  } finally {
    running = false;
  }
};

let started = false;
const startAgendaScheduler = () => {
  if (started) return;
  started = true;
  setTimeout(tick, 60 * 1000);
  setInterval(tick, CHECK_EVERY_MS);
  console.log('Agenda : rappels automatiques activés');
};

const smsStatus = async () => {
  const client = twilioClient();
  if (!client) return { configured: false, ok: false, message: 'Identifiants Twilio absents' };
  try {
    const acc = await client.api.v2010.accounts(process.env.TWILIOACCOUNDSID).fetch();
    const nums = await client.incomingPhoneNumbers.list({ phoneNumber: TWILIO_FROM(), limit: 1 });
    return {
      configured: true,
      ok: acc.status === 'active' && nums.length > 0,
      accountStatus: acc.status,
      accountType: acc.type,
      fromNumber: TWILIO_FROM(),
      fromNumberOwned: nums.length > 0
    };
  } catch (e) {
    return { configured: true, ok: false, message: e.message };
  }
};

module.exports = {
  startAgendaScheduler,
  sendClientEmail,
  sendClientSms,
  sendDigest,
  smsStatus,
  nowParts,
  addDays,
  clientSms
};
