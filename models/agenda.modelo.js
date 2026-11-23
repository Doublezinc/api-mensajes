// Agenda de Groupe Double Z : services confirmés (déménagements, petits transports, livraisons)
// Sert de registre et de base pour les rappels automatiques (clients et entreprise).
const { Schema, model } = require('mongoose');

const AgendaSchema = new Schema({
  clientName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 40, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
  language: { type: String, enum: ['fr', 'en', 'es'], default: 'fr' },
  serviceType: {
    type: String,
    enum: ['demenagement', 'petit_transport', 'livraison', 'autre'],
    default: 'demenagement'
  },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  time: { type: String, match: /^\d{2}:\d{2}$/, default: '08:00' },
  departure: { type: String, trim: true, maxlength: 300, default: '' },
  destination: { type: String, trim: true, maxlength: 300, default: '' },
  crew: { type: Number, min: 1, max: 10, default: 2 },
  vehicle: { type: String, trim: true, maxlength: 80, default: '' },
  estimate: { type: String, trim: true, maxlength: 120, default: '' },
  total: { type: Number, min: 0, default: 0 },
  deposit: { type: Number, min: 0, default: 0 },
  depositPaid: { type: Boolean, default: false },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled'],
    default: 'confirmed',
    index: true
  },
  remindersEnabled: { type: Boolean, default: true },
  reminders: {
    email2: { type: Date, default: null },
    email1: { type: Date, default: null },
    sms1: { type: Date, default: null },
    lastError: { type: String, default: '' }
  },
  source: { type: String, trim: true, maxlength: 40, default: 'manuel' },
  sourceRef: { type: String, trim: true, maxlength: 80, default: '', index: true }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'agenda'
});

AgendaSchema.methods.toJSON = function () {
  const { _id, ...item } = this.toObject();
  item.id = String(_id);
  item.balance = Math.max(0, Math.round(((item.total || 0) - (item.depositPaid ? (item.deposit || 0) : 0)) * 100) / 100);
  return item;
};

const AgendaMetaSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: '' }
}, { versionKey: false, collection: 'agenda_meta' });

module.exports = {
  Agenda: model('Agenda', AgendaSchema),
  AgendaMeta: model('AgendaMeta', AgendaMetaSchema)
};
