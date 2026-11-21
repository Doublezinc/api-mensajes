const { Schema, model } = require('mongoose');

const PetitAddressSchema = new Schema({
  street: { type: String, required: true, trim: true, maxlength: 200 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  postalCode: { type: String, trim: true, maxlength: 10, default: '' },
  floor: { type: String, trim: true, maxlength: 20, default: '0' },
  elevator: { type: Boolean, default: false }
}, { _id: false });

const PetitTransportSchema = new Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    immutable: true
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  slot: {
    type: String,
    required: true,
    match: /^\d{2}:\d{2}$/
  },
  // Clave única del créneau mientras la reserva está activa. Se elimina al cancelar para liberar la hora.
  slotKey: {
    type: String,
    unique: true,
    sparse: true
  },
  items: { type: Number, required: true, min: 1, max: 3 },
  price: { type: Number, required: true, min: 0 },
  // Detalle del precio: base por artículos + zona + escaleras. custom = ciudad fuera de zona (precio a confirmar)
  pricing: {
    base: { type: Number, min: 0 },
    zone: { type: Number, default: null },
    distanceFee: { type: Number, min: 0, default: 0 },
    stairsFee: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0 },
    custom: { type: Boolean, default: false }
  },
  currency: { type: String, required: true, default: 'CAD' },
  itemsDescription: { type: String, required: true, trim: true, maxlength: 500 },
  contact: {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' }
  },
  addresses: {
    pickup: { type: PetitAddressSchema, required: true },
    delivery: { type: PetitAddressSchema, required: true }
  },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  serviceAreaAccepted: { type: Boolean, required: true },
  language: { type: String, enum: ['fr', 'en', 'es'], default: 'fr' },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  statusNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  statusUpdatedAt: { type: Date, default: Date.now },
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'petitstransports'
});

PetitTransportSchema.index({ date: 1, slot: 1 });

module.exports = model('PetitTransport', PetitTransportSchema);
